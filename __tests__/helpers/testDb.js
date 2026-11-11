// Finds the test database and makes sure it is safe to wipe.
// The API tests empty every table before each test file, so they must NEVER run against
// the real database. They only run when TEST_DATABASE_URL is set (in .env or the environment)
// and it is different from DATABASE_URL.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

export const ROOT = path.resolve(import.meta.dirname, '../..');

// Reads .env without overwriting anything already set in the environment (e.g. by CI).
export function loadEnv() {
  dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
}

// Returns the test database URL, or null when API tests should be skipped.
export function testDatabaseUrl() {
  loadEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is the same as DATABASE_URL. The API tests delete all data, '
      + 'so they need a separate, empty database. See "Testing" in README.md.');
  }
  return url;
}

// Same SSL rule as server/db.js: Supabase needs SSL, a local Postgres usually has none.
export function newClient(url) {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
}

// Refuses to continue if the database holds users that are not test or sample accounts.
// Every seeded and test account uses an @example.com address.
export async function assertNoRealData(client) {
  const { rows: [t] } = await client.query("SELECT to_regclass('public.users') AS exists");
  if (!t.exists) return;
  const { rows: [r] } = await client.query(
    "SELECT COUNT(*)::int AS n FROM users WHERE email NOT LIKE '%@example.com'");
  if (r.n > 0) {
    throw new Error(`The test database has ${r.n} user(s) with real-looking email addresses. `
      + 'Refusing to delete its data. Point TEST_DATABASE_URL at an empty database.');
  }
}

export const readSql = (file) => fs.readFileSync(path.join(ROOT, 'db', file), 'utf8');
