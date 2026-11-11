// Session cookie and logout (FR1, NFR1).
// Kept in its own file because the login rate limits are counted per test file.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { db, getApp, hasDb, loginAs, resetDb, startLogin, USERS } from '../helpers/api.js';

describe.skipIf(!hasDb)('session and logout', () => {
  beforeAll(resetDb);

  it('A11: logging out clears the cookie and later requests are refused', async () => {
    const agent = await loginAs('farmer');
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(out.body.message).toBe('Logged out.');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('logging in and out is recorded in the audit log', async () => {
    const { rows } = await db().query(
      "SELECT action FROM audit_logs WHERE user_id = 3 AND action IN ('LOGIN_CODE_SENT', 'LOGIN', 'LOGOUT') ORDER BY log_id");
    expect(rows.map((r) => r.action)).toEqual(['LOGIN_CODE_SENT', 'LOGIN', 'LOGOUT']);
  });

  it('a forged or tampered cookie is refused', async () => {
    const res = await request(getApp()).get('/api/auth/me').set('Cookie', 'mt_token=not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Your session has expired. Please log in again.');
  });

  it('the halfway 2FA cookie cannot be used as a login cookie', async () => {
    const { res } = await startLogin(USERS.farmer.email);
    const halfway = res.headers['set-cookie'].find((c) => c.startsWith('mt_2fa=')).split(';')[0].split('=')[1];
    const me = await request(getApp()).get('/api/auth/me').set('Cookie', `mt_token=${halfway}`);
    expect(me.status).toBe(401);
  });

  it('GET /api/config gives logged-in users the price per litre', async () => {
    const agent = await loginAs('admin');
    const res = await agent.get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ price_per_litre: 50, cooperative_name: 'MaziwaTrack Dairy Cooperative' });
  });
});
