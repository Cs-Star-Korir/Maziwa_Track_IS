// X8: password guessing is limited to 10 failed logins per 15 minutes.
// In its own file because it uses up the limit for the rest of the file.
import { beforeAll, describe, expect, it } from 'vitest';
import { hasDb, resetDb, startLogin, USERS } from '../helpers/api.js';

describe.skipIf(!hasDb)('login rate limit', () => {
  beforeAll(resetDb);

  it('a successful login does not count towards the limit', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await startLogin(USERS.farmer.email)).res.status).toBe(200);
    }
  });

  it('X8: the 11th failed login within 15 minutes is blocked, even with the right password', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await startLogin(USERS.farmer.email, 'WrongPassword1')).res.status).toBe(401);
    }
    const blocked = await startLogin(USERS.farmer.email, 'WrongPassword1');
    expect(blocked.res.status).toBe(429);
    expect(blocked.res.body.message).toBe('Too many login attempts. Try again in 15 minutes.');
    expect((await startLogin(USERS.farmer.email)).res.status).toBe(429);
  });
});
