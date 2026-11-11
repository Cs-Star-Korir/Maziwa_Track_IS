// Server basics: health check, unknown routes, bad JSON, security headers.
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { getApp, hasDb, resetDb } from '../helpers/api.js';

describe.skipIf(!hasDb)('server basics', () => {
  beforeAll(resetDb);

  it('S1: GET /api/health reports the server and database are up', async () => {
    const res = await request(getApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(new Date(res.body.time).toString()).not.toBe('Invalid Date');
  });

  it('answers unknown API routes with 404 "Not found."', async () => {
    const res = await request(getApp()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Not found.');
  });

  it('answers broken JSON with 400 "Invalid JSON."', async () => {
    const res = await request(getApp()).post('/api/auth/login')
      .set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON.');
  });

  it('sends security headers (helmet) and hides the framework name', async () => {
    const res = await request(getApp()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the React app (CLIENT_ORIGIN) to send the login cookie', async () => {
    const res = await request(getApp()).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('protected routes answer 401 without a login cookie', async () => {
    for (const path of ['/api/auth/me', '/api/config', '/api/batches', '/api/batches/mine', '/api/audit-logs']) {
      const res = await request(getApp()).get(path);
      expect(res.status, path).toBe(401);
    }
  });
});
