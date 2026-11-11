// Runs once before all API tests: checks the test database and creates the tables (db/schema.sql).
import { assertNoRealData, newClient, readSql, testDatabaseUrl } from '../helpers/testDb.js';

export default async function setup() {
  const url = testDatabaseUrl();
  if (!url) {
    console.log('\n[api tests] TEST_DATABASE_URL is not set, so the API tests are skipped. '
      + 'See "Testing" in README.md.\n');
    return;
  }
  const client = newClient(url);
  await client.connect();
  try {
    await assertNoRealData(client);
    await client.query(readSql('schema.sql')); // safe to run again: only creates what is missing
  } finally {
    await client.end();
  }
}
