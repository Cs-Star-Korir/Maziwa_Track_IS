// Shared helpers for the API tests: the Express app, a clean database, logging in with 2FA,
// and reading the emails the server sent.
import { createRequire } from 'node:module';
import request from 'supertest';
import { newClient, readSql } from './testDb.js';

const require = createRequire(import.meta.url);

// True when a separate test database is configured (see setup/api.js).
export const hasDb = process.env.MT_HAS_TEST_DB === 'yes';

// Seeded accounts from db/01_users.sql. They all use the same password.
export const PASSWORD = 'Password123';
export const USERS = {
  admin: { email: 'grace.njeri@example.com', name: 'Grace Njeri' },
  grader: { email: 'peter.otieno@example.com', name: 'Peter Otieno' },
  grader2: { email: 'petero.ndungu@example.com', name: 'Petero Ndungu' },
  farmer: { email: 'wanjiku.mwangi@example.com', name: 'Wanjiku Mwangi' },
  farmer2: { email: 'kamau.njoroge@example.com', name: 'Kamau Njoroge' },
};

// The server code is CommonJS, so it is loaded with require (only once settings are in place).
let app;
export const getApp = () => (app ??= require('../../server/app.js'));
export const db = () => require('../../server/db.js').pool;

// Empties every table and loads the seeded users again, so each test file starts the same way.
export async function resetDb() {
  const client = newClient(process.env.DATABASE_URL);
  await client.connect();
  try {
    await client.query(`TRUNCATE login_codes, password_resets, audit_logs, payments, batches, users
                        RESTART IDENTITY CASCADE`);
    await client.query(readSql('01_users.sql'));
  } finally {
    await client.end();
  }
  inbox().length = 0;
}

// ---------- emails ----------
export const smtp = () => globalThis.__smtp;
export const inbox = () => smtp().inbox;

// The newest email sent to this address (optionally only those sent after position `since`).
export function lastMailTo(email, since = 0) {
  return inbox().slice(since).reverse().find((m) => m.to.includes(email));
}

// The 6-digit login code from the newest login-code email to this address.
export function lastCode(email, since = 0) {
  const mail = inbox().slice(since).reverse().find((m) => m.to.includes(email) && /login code/i.test(m.subject));
  return mail && /(\d{6})/.exec(mail.subject)[1];
}

// ---------- logging in ----------
// Step 1 only: email + password. Returns the agent, which now holds the "halfway" 2FA cookie.
export async function startLogin(email, password = PASSWORD) {
  const agent = request.agent(getApp());
  const since = inbox().length;
  const res = await agent.post('/api/auth/login').send({ email, password });
  return { agent, res, code: lastCode(email, since) };
}

// Both steps: password, then the emailed code. Returns a logged-in agent (it keeps the cookie).
export async function loginAs(who) {
  const { email } = USERS[who] || { email: who };
  const { agent, res, code } = await startLogin(email);
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${res.text}`);
  const verified = await agent.post('/api/auth/verify-code').send({ code });
  if (verified.status !== 200) throw new Error(`Code check failed for ${email}: ${verified.text}`);
  return agent;
}

// A farmer records a delivery; returns the new batch.
export async function recordDelivery(farmerAgent, litres = 20) {
  const res = await farmerAgent.post('/api/batches').send({ declared_litres: litres });
  if (res.status !== 201) throw new Error(`Could not record delivery: ${res.text}`);
  return res.body;
}

// A grader tests a batch; returns the updated batch.
export async function testBatch(graderAgent, batchNumber, measured, result = 'pass', notes) {
  const res = await graderAgent.patch(`/api/batches/${batchNumber}/verify`)
    .send({ measured_litres: measured, quality_result: result, grader_notes: notes });
  if (res.status !== 200) throw new Error(`Could not test batch: ${res.text}`);
  return res.body;
}
