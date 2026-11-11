// Reset links that were replaced or expired, and the limit on reset requests.
// Separate from passwordReset.test.js because only 5 reset requests are allowed per 15 minutes.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db, getApp, hasDb, inbox, lastMailTo, resetDb, USERS } from '../helpers/api.js';

const tokenFrom = (mail) => /reset-password\?token=([0-9a-f]{64})/.exec(mail.text)[1];

async function askForLink(email) {
  const since = inbox().length;
  const res = await request(getApp()).post('/api/auth/forgot-password').send({ email });
  return { res, mail: lastMailTo(email, since) };
}

describe.skipIf(!hasDb)('reset links: replaced, expired, limited', () => {
  beforeAll(resetDb);

  it('resetting the password cancels any other unused links for that account', async () => {
    const a = tokenFrom((await askForLink(USERS.grader2.email)).mail);
    const b = tokenFrom((await askForLink(USERS.grader2.email)).mail);
    expect((await request(getApp()).post('/api/auth/reset-password').send({ token: b, password: 'NewPassword1' })).status).toBe(200);
    expect((await request(getApp()).post('/api/auth/reset-password').send({ token: a, password: 'NewPassword2' })).status).toBe(400);
  });

  it('an expired link is refused', async () => {
    const email = 'achieng.odhiambo@example.com';
    const token = tokenFrom((await askForLink(email)).mail);
    await db().query("UPDATE password_resets SET expires_at = now() - interval '1 minute'");
    const res = await request(getApp()).post('/api/auth/reset-password').send({ token, password: 'NewPassword1' });
    expect(res.status).toBe(400);
  });

  it('the 6th reset request within 15 minutes is refused', async () => {
    await askForLink('nobody@example.com'); // 4th
    await askForLink('nobody@example.com'); // 5th
    const { res } = await askForLink(USERS.farmer.email);
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Too many requests. Try again in 15 minutes.');
  });
});
