// PostgreSQL (Supabase) connection pool and small database helpers.
const { Pool, types } = require('pg');

// NUMERIC columns (litres, prices) come back as numbers, not strings.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)));

const url = process.env.DATABASE_URL || '';
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

const pool = new Pool({
  connectionString: url,
  // Supabase requires an encrypted connection; a local Postgres usually has no SSL.
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
});

// Times are stored as TIMESTAMPTZ (an exact moment), so the API always returns UTC
// and the frontend shows local time. Kenyan dates are worked out with LOCAL_TZ below.

// The cooperative's time zone (Kenya), used for batch-number dates and date filters.
// Use a named zone: Postgres reads offsets like '+03:00' the opposite way round.
const LOCAL_TZ = process.env.TIME_ZONE || 'Africa/Nairobi';

// Runs fn(client) inside a transaction: commit if it succeeds, roll back if it throws.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // always give the connection back, or the app runs out of them
  }
}

// Adds one row to audit_logs. Pass a transaction client to keep it in the same transaction.
async function audit(db, userId, action, { table = null, recordId = null, oldValue = null, newValue = null } = {}) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, table, recordId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null],
  );
}

module.exports = { pool, withTransaction, audit, LOCAL_TZ };