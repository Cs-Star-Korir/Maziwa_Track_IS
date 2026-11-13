// Forgot / reset password by email. Test IDs (W1, W2, ...) match the end-to-end test plan.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db, getApp, hasDb, inbox, lastMailTo, resetDb, startLogin, USERS } from '../helpers/api.js';

const SAME_REPLY = "If an account exists for that email, we've sent a link to reset your password.";
const tokenFrom = (mail) => /reset-password\?token=([0-9a-f]{64})/.exec(mail.text)[1];

async function askForLink(email) {
  const since = inbox().length;
  const res = await request(getApp()).post('/api/auth/forgot-password').send({ email });
  return { res, mail: lastMailTo(email, since) };
}

describe.skipIf(!hasDb)('forgot and reset password', () => {
  let farmerLink; // the email from W2, reused below (only 5 reset requests are allowed per 15 minutes)
  beforeAll(resetDb);

  it('W1: an unknown email gets the same reply and no email is sent', async () => {
    const before = inbox().length;
    const { res } = await askForLink('nobody@example.com');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(SAME_REPLY);
    expect(inbox().length).toBe(before);
  });

  it('W2: a known email gets the same reply and an email with a one-time link', async () => {
    const { res, mail } = await askForLink(USERS.farmer.email);
    farmerLink = mail;
    expect(res.body.message).toBe(SAME_REPLY);
    expect(mail.subject).toBe('Reset your MaziwaTrack password');
    expect(mail.text).toMatch(/http:\/\/localhost:5173\/reset-password\?token=[0-9a-f]{64}/);
    expect(mail.text).toContain('expires in 30 minutes');
    expect(mail.html).toContain('Set a new password');
  });

  it('only stores a hash of the link token', async () => {
    const { rows } = await db().query('SELECT token_hash FROM password_resets ORDER BY reset_id DESC LIMIT 1');
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].token_hash).not.toBe(tokenFrom(farmerLink));
  });

  it('W3: a new password shorter than 8 characters is refused', async () => {
    const res = await request(getApp()).post('/api/auth/reset-password')
      .send({ token: tokenFrom(farmerLink), password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password must be at least 8 characters.');
  });

  it('a made-up token is refused', async () => {
    const res = await request(getApp()).post('/api/auth/reset-password')
      .send({ token: 'f'.repeat(64), password: 'NewPassword1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('This reset link is invalid or has expired. Please ask for a new one.');
  });

  it('W3 + W4 + W5: the link sets a new password once; the new password works and the old one does not', async () => {
    const { mail } = await askForLink(USERS.grader.email);
    const token = tokenFrom(mail);

    const first = await request(getApp()).post('/api/auth/reset-password').send({ token, password: 'NewPassword1' });
    expect(first.status).toBe(200);
    expect(first.body.message).toBe('Password changed. You can now log in.');

    // W5: the same link cannot be used twice
    const second = await request(getApp()).post('/api/auth/reset-password').send({ token, password: 'Another123' });
    expect(second.status).toBe(400);

    // W4: new password works (a code is emailed), old password is refused
    expect((await startLogin(USERS.grader.email, 'NewPassword1')).res.status).toBe(200);
    expect((await startLogin(USERS.grader.email, 'Password123')).res.status).toBe(401);
  });

  it('the requests and the reset are recorded in the audit log', async () => {
    const { rows } = await db().query(
      "SELECT action FROM audit_logs WHERE user_id = 2 AND action LIKE 'PASSWORD_RESET%' ORDER BY log_id");
    expect(rows.map((r) => r.action)).toEqual(['PASSWORD_RESET_REQUEST', 'PASSWORD_RESET']);
  });
});
