// MySQL / MariaDB connection pool and small database helpers.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'maziwa-track',
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL columns come back as numbers, not strings
  timezone: 'Z',        // all timestamps are handled in UTC; the frontend shows local time
  dateStrings: false,
});

// Every new connection: UTC session time, and strict mode so bad values are rejected.
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
  conn.query("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES')");
});

// The cooperative's local time zone (Kenya), used for batch-number dates and date filters.
const LOCAL_TZ = process.env.LOCAL_TZ_OFFSET || '+03:00';

// Runs fn(conn) inside a transaction: commit if it succeeds, roll back if it throws.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Adds one row to audit_logs. Pass a transaction connection to keep it in the same transaction.
async function audit(db, userId, action, { table = null, recordId = null, oldValue = null, newValue = null } = {}) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, table, recordId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null],
  );
}

module.exports = { pool, withTransaction, audit, LOCAL_TZ };
