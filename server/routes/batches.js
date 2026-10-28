// Milk deliveries: farmer records (FR2), grader verifies (FR3), admin views and filters (FR4/FR5).
const express = require('express');
const crypto = require('crypto');
const { pool, withTransaction, audit, LOCAL_TZ } = require('../db');
const { requireAuth, requireRole } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// One query used by every list: batch + farmer's name + its payment (if any).
const BATCH_SELECT = `
  SELECT b.*, f.full_name AS farmer_name,
         p.payment_reference, p.price_per_litre, p.email_sent, p.approved_at
  FROM batches b
  JOIN users f ON f.user_id = b.farmer_id
  LEFT JOIN payments p ON p.batch_id = b.batch_id`;

// Turns a joined row into the shape the frontend expects (payment = null until paid).
function toBatch(r) {
  const payment = r.payment_reference ? {
    payment_reference: r.payment_reference,
    price_per_litre: r.price_per_litre,
    amount: Math.round(r.measured_litres * r.price_per_litre * 100) / 100, // calculated, not stored
    email_sent: !!r.email_sent,
    approved_at: r.approved_at,
  } : null;
  return {
    batch_id: r.batch_id,
    batch_number: r.batch_number,
    farmer_id: r.farmer_id,
    farmer_name: r.farmer_name,
    declared_litres: r.declared_litres,
    status: r.status,
    delivered_at: r.delivered_at,
    grader_id: r.grader_id,
    measured_litres: r.measured_litres,
    quality_result: r.quality_result,
    grader_notes: r.grader_notes,
    tested_at: r.tested_at,
    payment,
  };
}

async function findBatch(db, batchNumber) {
  const { rows } = await db.query(`${BATCH_SELECT} WHERE b.batch_number = $1`, [batchNumber]);
  return rows[0] ? toBatch(rows[0]) : null;
}

const isPositiveNumber = (v) => typeof v === 'number' ? v > 0 : v !== '' && v !== null && Number(v) > 0;

// POST /api/batches – farmer records a delivery and gets a unique batch number
router.post('/', requireRole('farmer'), async (req, res) => {
  if (!isPositiveNumber(req.body.declared_litres)) {
    return res.status(400).json({ message: 'Litres must be a number greater than 0' });
  }
  const litres = Math.round(Number(req.body.declared_litres) * 100) / 100;

  const batchNumber = await withTransaction(async (conn) => {
    // Insert with a temporary number, then build the real one from the new batch_id,
    // so numbers are always unique and never reused: MT-YYYYMMDD-0007
    const temp = `TMP-${crypto.randomBytes(6).toString('hex')}`;
    const { rows: [b] } = await conn.query(
      'INSERT INTO batches (batch_number, farmer_id, declared_litres) VALUES ($1, $2, $3) RETURNING batch_id',
      [temp, req.user.user_id, litres]);
    const { rows: [{ d }] } = await conn.query(
      "SELECT to_char(now() AT TIME ZONE $1, 'YYYYMMDD') AS d", [LOCAL_TZ]);
    const number = `MT-${d}-${String(b.batch_id).padStart(4, '0')}`;
    await conn.query('UPDATE batches SET batch_number = $1 WHERE batch_id = $2', [number, b.batch_id]);
    await audit(conn, req.user.user_id, 'RECORD_DELIVERY',
      { table: 'batches', recordId: b.batch_id, newValue: { declared_litres: litres } });
    return number;
  });

  res.status(201).json(await findBatch(pool, batchNumber));
});

// GET /api/batches/mine – the logged-in farmer's deliveries, newest first
router.get('/mine', requireRole('farmer'), async (req, res) => {
  const { rows } = await pool.query(
    `${BATCH_SELECT} WHERE b.farmer_id = $1 ORDER BY b.delivered_at DESC, b.batch_id DESC`, [req.user.user_id]);
  res.json(rows.map(toBatch));
});

// GET /api/batches?status=&from=&to=&farmer=  (dates are YYYY-MM-DD, local time)
// Graders only ever see batches waiting to be tested; admins can filter freely.
router.get('/', requireRole('grader', 'admin'), async (req, res) => {
  const where = [];
  const params = [];
  const p = (value) => { params.push(value); return `$${params.length}`; }; // adds a value, returns its $n
  const status = req.user.role === 'grader' ? 'recorded' : req.query.status;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  if (status) {
    if (!['recorded', 'passed', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Unknown status.' });
    }
    where.push(`b.status = ${p(status)}`);
  }
  for (const [key, op] of [['from', '>='], ['to', '<=']]) {
    if (req.query[key]) {
      if (!dateRe.test(req.query[key])) return res.status(400).json({ message: `"${key}" must be a date like 2026-10-19.` });
      where.push(`(b.delivered_at AT TIME ZONE ${p(LOCAL_TZ)})::date ${op} ${p(req.query[key])}`);
    }
  }
  // ILIKE ignores upper/lower case, so "wanjiku" finds "Wanjiku"
  if (req.query.farmer) { where.push(`f.full_name ILIKE ${p(`%${req.query.farmer}%`)}`); }

  const order = req.user.role === 'grader' ? 'ASC' : 'DESC'; // graders work oldest first (queue order)
  const { rows } = await pool.query(
    `${BATCH_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.delivered_at ${order}, b.batch_id ${order}`, params);
  res.json(rows.map(toBatch));
});

// PATCH /api/batches/:batch_number/verify – grader enters measured litres and pass/reject
router.patch('/:batch_number/verify', requireRole('grader'), async (req, res) => {
  const { measured_litres, quality_result } = req.body;
  const notes = req.body.grader_notes ? String(req.body.grader_notes).trim().slice(0, 1000) : null;

  if (!isPositiveNumber(measured_litres)) {
    return res.status(400).json({ message: 'Measured litres must be a number greater than 0' });
  }
  if (!['pass', 'reject'].includes(quality_result)) {
    return res.status(400).json({ message: 'Choose Pass or Reject.' });
  }
  const measured = Math.round(Number(measured_litres) * 100) / 100;
  const newStatus = quality_result === 'pass' ? 'passed' : 'rejected';

  await withTransaction(async (conn) => {
    // FOR UPDATE locks the row so two graders cannot test the same batch at once
    const { rows } = await conn.query(
      'SELECT batch_id, status FROM batches WHERE batch_number = $1 FOR UPDATE', [req.params.batch_number]);
    if (!rows.length) throw Object.assign(new Error('Batch not found.'), { status: 404 });
    if (rows[0].status !== 'recorded') throw Object.assign(new Error('This batch has already been tested.'), { status: 409 });

    await conn.query(
      `UPDATE batches SET grader_id = $1, measured_litres = $2, quality_result = $3, grader_notes = $4,
              tested_at = now(), status = $5 WHERE batch_id = $6`,
      [req.user.user_id, measured, quality_result, notes, newStatus, rows[0].batch_id]);
    await audit(conn, req.user.user_id, 'TEST_BATCH', {
      table: 'batches', recordId: rows[0].batch_id,
      oldValue: { status: 'recorded' },
      newValue: { measured_litres: measured, quality_result, status: newStatus },
    });
  });

  res.json(await findBatch(pool, req.params.batch_number));
});

module.exports = router;
module.exports.findBatch = findBatch;