// GET /api/audit-logs?user=&action=&date= – admin views the audit log (FR5). Read only:
// there is deliberately no route to edit or delete audit entries.
const express = require('express');
const { pool, LOCAL_TZ } = require('../db');
const { requireAuth, requireRole } = require('./auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const p = (value) => { params.push(value); return `$${params.length}`; }; // adds a value, returns its $n
  if (req.query.user) { where.push(`u.full_name = ${p(req.query.user)}`); }
  if (req.query.action) { where.push(`l.action = ${p(req.query.action)}`); }
  if (req.query.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) return res.status(400).json({ message: '"date" must be like 2026-10-19.' });
    where.push(`(l.created_at AT TIME ZONE ${p(LOCAL_TZ)})::date = ${p(req.query.date)}`);
  }

  const { rows } = await pool.query(
    `SELECT l.log_id, l.user_id, u.full_name AS user_name, l.action, l.table_name, l.record_id,
            l.old_value, l.new_value, l.created_at,
            CASE WHEN l.table_name = 'batches' THEN b.batch_number END AS batch_number
     FROM audit_logs l
     JOIN users u ON u.user_id = l.user_id
     LEFT JOIN batches b ON l.table_name = 'batches' AND b.batch_id = l.record_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.created_at DESC, l.log_id DESC
     LIMIT 1000`, params);

  // old_value and new_value are JSONB, so they already arrive as objects
  res.json(rows);
});

module.exports = router;