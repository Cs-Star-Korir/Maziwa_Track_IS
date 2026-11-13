// Login (with an emailed 2FA code), register, logout, "who am I", forgot/reset password –
// plus the middleware that protects every other route.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool, withTransaction, audit } = require('../db');
const { sendMail, mailConfigured, escapeHtml, layout } = require('../mail');

const router = express.Router();
const COOKIE = 'mt_token';          // the real login cookie
const COOKIE_2FA = 'mt_2fa';        // "password was right, code still needed" (10 minutes)
const TOKEN_HOURS = 8;
const CODE_MINUTES = 10;            // a login code is valid for 10 minutes
const CODE_MAX_ATTEMPTS = 5;        // wrong guesses allowed per code
const RESEND_WAIT_SECONDS = 60;     // minimum gap between two codes
const RESET_MINUTES = 30;           // a password reset link is valid for 30 minutes

const cookieOptions = {
  httpOnly: true,                                  // JavaScript in the browser cannot read it
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',    // true when served over HTTPS
  maxAge: TOKEN_HOURS * 60 * 60 * 1000,
};
const cookieOptions2fa = { ...cookieOptions, maxAge: CODE_MINUTES * 60 * 1000 };

const publicUser = (u) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email, role: u.role });

// SHA-256 hash, used for login codes and reset tokens: the database never stores the real value.
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// ---------- middleware used by the other route files ----------

// Reads the login cookie and loads the user. 401 if missing, invalid, or the account is disabled.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE];
    if (!token) return res.status(401).json({ message: 'Please log in.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose) throw new Error('not a login token'); // a 2FA "halfway" token never logs anyone in
    const { rows } = await pool.query(
      'SELECT user_id, full_name, email, role, is_active FROM users WHERE user_id = $1', [payload.user_id]);
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

// ---------- validation and limits ----------

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

// Code checks and reset requests: a little looser, but still limited per IP address.
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});
const forgotLimiter = rateLimit({ // reset-link emails asked for
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests. Try again in 15 minutes.' },
});
const resetLimiter = rateLimit({ // new passwords submitted
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});

// ---------- 2FA helpers ----------

// Creates a fresh 6-digit code for the user (older unused codes stop working) and emails it.
// Returns true if the email went out, or if mail isn't configured (the code is then printed in the terminal).
async function sendLoginCode(user) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); // crypto, never Math.random
  await withTransaction(async (conn) => {
    await conn.query('UPDATE login_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.user_id]);
    await conn.query(
      `INSERT INTO login_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`, [user.user_id, sha256(code), CODE_MINUTES]);
    await audit(conn, user.user_id, 'LOGIN_CODE_SENT');
  });
  const sent = await sendMail({
    to: user.email,
    subject: `Your MaziwaTrack login code: ${code}`,
    text: `Hello ${user.full_name},\n\nYour MaziwaTrack login code is ${code}. It expires in ${CODE_MINUTES} minutes.\n\nIf you did not try to log in, change your password.`,
    html: layout('Login code', `
      <p>Hello ${escapeHtml(user.full_name)},</p>
      <p>Your login code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:8px 0">${code}</p>
      <p>It expires in ${CODE_MINUTES} minutes. If you did not try to log in, change your password.</p>`),
  });
  return sent || !mailConfigured();
}

// Reads the "halfway" cookie: returns the user_id, or null if it's missing, expired or not a 2FA token.
function read2faCookie(req) {
  try {
    const payload = jwt.verify(req.cookies[COOKIE_2FA], process.env.JWT_SECRET);
    return payload.purpose === '2fa' ? payload.user_id : null;
  } catch {
    return null;
  }
}

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
    const { rows: [u] } = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'farmer') RETURNING user_id`,
      [full_name, email, phone, hash]);
    await audit(pool, u.user_id, 'REGISTER', { table: 'users', recordId: u.user_id, newValue: { full_name, email } });
    res.status(201).json({ user: { user_id: u.user_id, full_name, email, role: 'farmer' } });
  } catch (err) {
    if (err.code === '23505') { // unique rule broken: the email or phone is already used
      const which = err.constraint === 'uq_users_phone' ? 'phone number' : 'email';
      return res.status(409).json({ message: `An account with this ${which} already exists.` });
    }
    throw err;
  }
});

// POST /api/auth/login – step 1 of 2: check the password, then email a 6-digit code.
// The real login cookie is only set by /verify-code.
router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Same message whether the email or the password is wrong, so attackers learn nothing.
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Incorrect email or password. Please try again.' });
  }

  if (!(await sendLoginCode(user))) {
    return res.status(502).json({ message: 'We could not email your login code. Please try again.' });
  }
  const token = jwt.sign({ user_id: user.user_id, purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: `${CODE_MINUTES}m` });
  res.cookie(COOKIE_2FA, token, cookieOptions2fa);
  res.json({ twoFactor: true });
});

// POST /api/auth/verify-code – step 2 of 2: check the emailed code, then log in for real.
router.post('/verify-code', codeLimiter, async (req, res) => {
  const userId = read2faCookie(req);
  if (!userId) return res.status(401).json({ message: 'Your login has expired. Please log in again.' });
  const code = String(req.body.code || '').trim();

  const { rows } = await pool.query(
    `SELECT code_id, code_hash, attempts FROM login_codes
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY code_id DESC LIMIT 1`, [userId]);
  const current = rows[0];
  if (!current) return res.status(401).json({ message: 'This code has expired. Please log in again.' });

  if (sha256(code) !== current.code_hash) {
    const attempts = current.attempts + 1;
    const lockOut = attempts >= CODE_MAX_ATTEMPTS;
    await pool.query(
      `UPDATE login_codes SET attempts = $1, used_at = CASE WHEN $2 THEN now() ELSE used_at END WHERE code_id = $3`,
      [attempts, lockOut, current.code_id]);
    await audit(pool, userId, 'LOGIN_CODE_FAILED', { newValue: { attempts } });
    if (lockOut) {
      res.clearCookie(COOKIE_2FA, { ...cookieOptions2fa, maxAge: undefined });
      return res.status(401).json({ message: 'Too many wrong codes. Please log in again.' });
    }
    return res.status(401).json({ message: `That code is not right. ${CODE_MAX_ATTEMPTS - attempts} tries left.` });
  }

  await pool.query('UPDATE login_codes SET used_at = now() WHERE code_id = $1', [current.code_id]);
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  if (!user || !user.is_active) return res.status(401).json({ message: 'Please log in.' });

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: `${TOKEN_HOURS}h` });
  res.clearCookie(COOKIE_2FA, { ...cookieOptions2fa, maxAge: undefined });
  res.cookie(COOKIE, token, cookieOptions);
  await audit(pool, user.user_id, 'LOGIN');
  res.json({ user: publicUser(user) });
});

// POST /api/auth/resend-code – a new code, at most one per minute.
router.post('/resend-code', codeLimiter, async (req, res) => {
  const userId = read2faCookie(req);
  if (!userId) return res.status(401).json({ message: 'Your login has expired. Please log in again.' });

  const { rows: [last] } = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (now() - created_at)) AS age FROM login_codes
     WHERE user_id = $1 ORDER BY code_id DESC LIMIT 1`, [userId]);
  if (last && Number(last.age) < RESEND_WAIT_SECONDS) {
    const wait = Math.ceil(RESEND_WAIT_SECONDS - Number(last.age));
    return res.status(429).json({ message: `Please wait ${wait} seconds before asking for a new code.` });
  }
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  if (!user || !user.is_active) return res.status(401).json({ message: 'Please log in.' });
  if (!(await sendLoginCode(user))) {
    return res.status(502).json({ message: 'We could not email your login code. Please try again.' });
  }
  res.json({ message: 'A new code has been sent to your email.' });
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
  res.clearCookie(COOKIE_2FA, { ...cookieOptions2fa, maxAge: undefined });
  res.json({ message: 'Logged out.' });
});

// POST /api/auth/forgot-password – emails a reset link. Same reply whether or not the email exists,
// so nobody can use this form to find out which emails have accounts.
const FORGOT_REPLY = { message: "If an account exists for that email, we've sent a link to reset your password." };
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { rows } = await pool.query('SELECT user_id, full_name, email FROM users WHERE email = $1 AND is_active', [email]);
  const user = rows[0];
  if (!user) return res.json(FORGOT_REPLY);

  const token = crypto.randomBytes(32).toString('hex'); // 64 random characters; only its hash is stored
  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`, [user.user_id, sha256(token), RESET_MINUTES]);
  await audit(pool, user.user_id, 'PASSWORD_RESET_REQUEST');

  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const link = `${appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your MaziwaTrack password',
    text: `Hello ${user.full_name},\n\nUse this link to set a new password. It works once and expires in ${RESET_MINUTES} minutes:\n${link}\n\nIf you did not ask for this, ignore this email; your password stays the same.`,
    html: layout('Password reset', `
      <p>Hello ${escapeHtml(user.full_name)},</p>
      <p>Click the button to set a new password. The link works once and expires in ${RESET_MINUTES} minutes.</p>
      <p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none">Set a new password</a></p>
      <p style="font-size:12px;color:#6b7280">Or copy this link: ${link}</p>
      <p>If you did not ask for this, ignore this email; your password stays the same.</p>`),
  });
  res.json(FORGOT_REPLY);
});

// POST /api/auth/reset-password – sets the new password if the link is still valid.
router.post('/reset-password', resetLimiter, async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

  const { rows } = await pool.query(
    `SELECT reset_id, user_id FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`, [sha256(token)]);
  if (!rows.length) return res.status(400).json({ message: 'This reset link is invalid or has expired. Please ask for a new one.' });
  const { user_id } = rows[0];

  const hash = await bcrypt.hash(password, 10);
  await withTransaction(async (conn) => {
    await conn.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, user_id]);
    // This link and any other unused links for the same user stop working
    await conn.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user_id]);
    await audit(conn, user_id, 'PASSWORD_RESET', { table: 'users', recordId: user_id });
  });
  res.json({ message: 'Password changed. You can now log in.' });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;