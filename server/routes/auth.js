// Login, register, logout, "who am I" – plus the middleware that protects every other route.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool, audit } = require('../db');

const router = express.Router();
const COOKIE = 'mt_token';
const TOKEN_HOURS = 8;

const cookieOptions = {
  httpOnly: true,                                  // JavaScript in the browser cannot read it
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',    // true when served over HTTPS
  maxAge: TOKEN_HOURS * 60 * 60 * 1000,
};

const publicUser = (u) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email, role: u.role });

// ---------- middleware used by the other route files ----------

// Reads the login cookie and loads the user. 401 if missing, invalid, or the account is disabled.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE];
    if (!token) return res.status(401).json({ message: 'Please log in.' });
    const { user_id } = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, role, is_active FROM users WHERE user_id = ?', [user_id]);
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ message: 'Please log in.' });
    req.user = publicUser(rows[0]);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

// Allows only the listed roles, e.g. requireRole('admin'). Always use after requireAuth.
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You are not allowed to do this.' });

// ---------- validation ----------

function validateRegister(b) {
  if (!b.full_name || String(b.full_name).trim().length < 3) return 'Enter your full name.';
  if (!/^0[17]\d{8}$/.test(String(b.phone || '').replace(/\s/g, ''))) return 'Enter a phone number like 0712 345 678.';
  if (!/^\S+@\S+\.\S+$/.test(String(b.email || ''))) return 'Enter a valid email address.';
  if (!b.password || String(b.password).length < 8) return 'Password must be at least 8 characters.';
  return null;
}

// Max 10 failed login attempts per 15 minutes per IP address (stops password guessing).
// Successful logins are not counted, so normal use is never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
});

// ---------- routes ----------

// POST /api/auth/register – farmers only; graders and admins are created by the administrator.
router.post('/register', async (req, res) => {
  const error = validateRegister(req.body);
  if (error) return res.status(400).json({ message: error });

  const full_name = req.body.full_name.trim();
  const phone = req.body.phone.replace(/\s/g, '');
  const email = req.body.email.trim().toLowerCase();
  const hash = await bcrypt.hash(req.body.password, 10);

  try {
    const [r] = await pool.query(
      "INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'farmer')",
      [full_name, email, phone, hash]);
    await audit(pool, r.insertId, 'REGISTER', { table: 'users', recordId: r.insertId, newValue: { full_name, email } });
    res.status(201).json({ user: { user_id: r.insertId, full_name, email, role: 'farmer' } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const which = err.message.includes('phone') ? 'phone number' : 'email';
      return res.status(409).json({ message: `An account with this ${which} already exists.` });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  // Same message whether the email or the password is wrong, so attackers learn nothing.
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Incorrect email or password. Please try again.' });
  }

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: `${TOKEN_HOURS}h` });
  res.cookie(COOKIE, token, cookieOptions);
  await audit(pool, user.user_id, 'LOGIN');
  res.json({ user: publicUser(user) });
});

// GET /api/auth/me – the frontend calls this when the page loads
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { user_id } = jwt.verify(req.cookies[COOKIE], process.env.JWT_SECRET);
    await audit(pool, user_id, 'LOGOUT');
  } catch { /* already logged out or token expired: nothing to record */ }
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Logged out.' });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
