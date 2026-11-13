// Accounts and login (FR1, NFR1): registration, password + emailed 2FA code, session, logout.
// Test IDs (A1, A2, ...) match the end-to-end test plan in the project documentation.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  db, getApp, hasDb, inbox, lastCode, lastMailTo, loginAs, resetDb, startLogin, USERS,
} from '../helpers/api.js';

const newFarmer = (extra = {}) => ({
  full_name: 'Test Farmer', phone: '0799 000 111', email: 'test.farmer@example.com', password: 'Password123', ...extra,
});

describe.skipIf(!hasDb)('registration (FR1)', () => {
  beforeAll(resetDb);

  it('A8: a farmer can register; the account is a farmer account', async () => {
    const res = await request(getApp()).post('/api/auth/register').send(newFarmer());
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ full_name: 'Test Farmer', email: 'test.farmer@example.com', role: 'farmer' });
  });

  it('stores only a bcrypt hash of the password, never the password itself (NFR1)', async () => {
    const { rows: [u] } = await db().query("SELECT password_hash, phone FROM users WHERE email = 'test.farmer@example.com'");
    expect(u.password_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(u.password_hash).not.toContain('Password123');
    expect(u.phone).toBe('0799000111'); // spaces removed
  });

  it('cannot be used to create grader or admin accounts', async () => {
    const res = await request(getApp()).post('/api/auth/register')
      .send(newFarmer({ email: 'sneaky@example.com', phone: '0799 000 222', role: 'admin' }));
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('farmer');
  });

  it.each([
    [{ full_name: 'Al' }, 'Enter your full name.'],
    [{ phone: '12345' }, 'Enter a phone number like 0712 345 678.'],
    [{ email: 'not-an-email' }, 'Enter a valid email address.'],
    [{ password: 'short' }, 'Password must be at least 8 characters.'],
  ])('refuses invalid details %o', async (change, message) => {
    const res = await request(getApp()).post('/api/auth/register')
      .send(newFarmer({ email: 'other@example.com', phone: '0799 000 333', ...change }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it('A9: refuses an email that is already registered (any letter case)', async () => {
    const res = await request(getApp()).post('/api/auth/register')
      .send(newFarmer({ email: 'TEST.Farmer@example.com', phone: '0799 000 444' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this email already exists.');
  });

  it('A9: refuses a phone number that is already registered', async () => {
    const res = await request(getApp()).post('/api/auth/register')
      .send(newFarmer({ email: 'another@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this phone number already exists.');
  });

  it('records the registration in the audit log', async () => {
    const { rows } = await db().query("SELECT new_value FROM audit_logs WHERE action = 'REGISTER'");
    expect(rows.map((r) => r.new_value.email)).toContain('test.farmer@example.com');
  });
});

describe.skipIf(!hasDb)('login with an emailed code (NFR1 2FA)', () => {
  beforeAll(resetDb);

  it('A1: a wrong password is refused with a general message and no email is sent', async () => {
    const before = inbox().length;
    const { res } = await startLogin(USERS.farmer.email, 'WrongPassword1');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please try again.');
    expect(inbox().length).toBe(before);
  });

  it('A1: an unknown email gets exactly the same answer (nothing is revealed)', async () => {
    const { res } = await startLogin('nobody@example.com');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please try again.');
  });

  it('A2: the right password emails a 6-digit code and does not log in yet', async () => {
    const since = inbox().length;
    const { agent, res } = await startLogin(USERS.farmer.email);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ twoFactor: true });
    const mail = lastMailTo(USERS.farmer.email, since);
    expect(mail.subject).toMatch(/^Your MaziwaTrack login code: \d{6}$/);
    expect(mail.text).toContain('It expires in 10 minutes');
    expect((await agent.get('/api/auth/me')).status).toBe(401); // the halfway cookie is not a login
  });

  it('A3: the right code logs in and returns the user with their role', async () => {
    const { agent, code } = await startLogin(USERS.farmer.email);
    const res = await agent.post('/api/auth/verify-code').send({ code });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ user_id: 3, full_name: 'Wanjiku Mwangi', email: USERS.farmer.email, role: 'farmer' });
    expect(res.headers['set-cookie'].join(';')).toMatch(/mt_token=.+HttpOnly/i);
  });

  it('A10: the login cookie keeps the user logged in (GET /api/auth/me)', async () => {
    const agent = await loginAs('grader');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: USERS.grader.email, role: 'grader' });
  });

  it('A4: a wrong code says how many tries are left', async () => {
    const { agent } = await startLogin(USERS.farmer2.email);
    const res = await agent.post('/api/auth/verify-code').send({ code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('That code is not right. 4 tries left.');
  });

  it('A5: after 5 wrong codes the code stops working and the user must log in again', async () => {
    const { agent, code } = await startLogin(USERS.admin.email);
    const wrong = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 4; i += 1) await agent.post('/api/auth/verify-code').send({ code: wrong });
    const fifth = await agent.post('/api/auth/verify-code').send({ code: wrong });
    expect(fifth.body.message).toBe('Too many wrong codes. Please log in again.');
    const right = await agent.post('/api/auth/verify-code').send({ code });
    expect(right.status).toBe(401); // even the right code is refused now
  });

  it('A6: asking for a new code within 60 seconds is refused with the wait time', async () => {
    const { agent } = await startLogin(USERS.grader2.email);
    const res = await agent.post('/api/auth/resend-code');
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/^Please wait \d+ seconds before asking for a new code\.$/);
  });

  it('A7: after a new code is sent, only the newest code works', async () => {
    const { agent, code: oldCode } = await startLogin(USERS.grader2.email);
    // pretend the first code was sent over a minute ago, so a resend is allowed
    await db().query("UPDATE login_codes SET created_at = now() - interval '2 minutes'");
    const since = inbox().length;
    const resend = await agent.post('/api/auth/resend-code');
    expect(resend.status).toBe(200);
    expect(resend.body.message).toBe('A new code has been sent to your email.');
    const newCode = lastCode(USERS.grader2.email, since);
    if (newCode !== oldCode) {
      expect((await agent.post('/api/auth/verify-code').send({ code: oldCode })).status).toBe(401);
    }
    expect((await agent.post('/api/auth/verify-code').send({ code: newCode })).status).toBe(200);
  });

  it('an expired code is refused', async () => {
    const { agent, code } = await startLogin(USERS.farmer.email);
    await db().query("UPDATE login_codes SET expires_at = now() - interval '1 second' WHERE used_at IS NULL");
    const res = await agent.post('/api/auth/verify-code').send({ code });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('This code has expired. Please log in again.');
  });

  it('checking a code without logging in first is refused', async () => {
    const res = await request(getApp()).post('/api/auth/verify-code').send({ code: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Your login has expired. Please log in again.');
  });

  it('only stores a hash of each login code', async () => {
    const { code } = await startLogin(USERS.farmer.email);
    const { rows } = await db().query('SELECT code_hash FROM login_codes ORDER BY code_id DESC LIMIT 1');
    expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].code_hash).not.toBe(code);
  });

  it('a deactivated account cannot log in', async () => {
    await db().query("UPDATE users SET is_active = FALSE WHERE email = 'kiprop.rotich@example.com'");
    const { res } = await startLogin('kiprop.rotich@example.com');
    expect(res.status).toBe(401);
  });
});
