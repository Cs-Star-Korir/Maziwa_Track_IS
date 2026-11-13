// Runs before each API test file, before the server code is loaded.
// Points the server at the test database and at a fake email server, with fixed test settings.
import { createRequire } from 'node:module';
import { afterAll } from 'vitest';
import { startSmtpServer } from '../helpers/smtpServer.js';
import { testDatabaseUrl } from '../helpers/testDb.js';

const url = testDatabaseUrl();

// Never let the server see the real DATABASE_URL during tests.
process.env.DATABASE_URL = url || '';
process.env.MT_HAS_TEST_DB = url ? 'yes' : '';
process.env.JWT_SECRET = 'test-secret-not-for-production';
process.env.COOKIE_SECURE = 'false';
process.env.PRICE_PER_LITRE = '50';
process.env.COOPERATIVE_NAME = 'MaziwaTrack Dairy Cooperative';
process.env.TIME_ZONE = 'Africa/Nairobi';
process.env.APP_URL = 'http://localhost:5173';
process.env.MAIL_FROM = 'MaziwaTrack <no-reply@example.com>';

// Every email the server sends during a test lands in this fake inbox (see helpers/smtpServer.js).
const smtp = await startSmtpServer();
globalThis.__smtp = smtp;
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = String(smtp.port);
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';

afterAll(async () => {
  // Close the database pool if this file used the server, so the test run can exit.
  const require = createRequire(import.meta.url);
  const dbPath = require.resolve('../../server/db.js');
  if (require.cache[dbPath]) await require(dbPath).pool.end();
  await smtp.close();
});
