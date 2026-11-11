// Access checks used by every protected route (server/routes/auth.js): requireRole and the
// parts of requireAuth that refuse a request before the database is needed.
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const SECRET = 'unit-test-secret';
let requireAuth;
let requireRole;

beforeAll(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
  vi.stubEnv('DATABASE_URL', ''); // nothing here talks to a database
  ({ requireAuth, requireRole } = require('../../server/routes/auth.js'));
});

// A tiny stand-in for Express's response object
function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('requireRole', () => {
  it('lets the listed roles through', () => {
    const next = vi.fn();
    requireRole('grader', 'admin')({ user: { role: 'admin' } }, fakeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('answers 403 for any other role', () => {
    const next = vi.fn();
    const res = fakeRes();
    requireRole('admin')({ user: { role: 'farmer' } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not allowed to do this.');
  });
});

describe('requireAuth (before any database lookup)', () => {
  it('answers 401 "Please log in." when there is no cookie', async () => {
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth({ cookies: {} }, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Please log in.');
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses a token signed with a different secret', async () => {
    const res = fakeRes();
    await requireAuth({ cookies: { mt_token: jwt.sign({ user_id: 1 }, 'someone-elses-secret') } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Your session has expired. Please log in again.');
  });

  it('refuses an expired token', async () => {
    const res = fakeRes();
    const old = jwt.sign({ user_id: 1, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    await requireAuth({ cookies: { mt_token: old } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });

  it('refuses the halfway 2FA token, which only proves the password was right', async () => {
    const res = fakeRes();
    const halfway = jwt.sign({ user_id: 1, purpose: '2fa' }, SECRET, { expiresIn: '10m' });
    await requireAuth({ cookies: { mt_token: halfway } }, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });
});
