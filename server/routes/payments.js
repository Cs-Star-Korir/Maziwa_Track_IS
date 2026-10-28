// POST /api/payments – admin approves payment for a passed batch; the farmer is emailed (FR4).
const express = require('express');
const nodemailer = require('nodemailer');
const { pool, withTransaction, audit, LOCAL_TZ } = require('../db');
const { requireAuth, requireRole } = require('./auth');
const { findBatch } = require('./batches');
const { PRICE_PER_LITRE, COOPERATIVE_NAME } = require('./config');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// Email is optional in development: without SMTP settings the email is printed to the console
// and email_sent stays false (the admin screen then says "Email could not be sent").
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;

async function emailFarmer(to, batch) {
  const p = batch.payment;
  const text = [
    `Hello ${batch.farmer_name},`,
    '',
    `Your milk payment has been approved by ${COOPERATIVE_NAME()}.`,
    `Batch: ${batch.batch_number}`,
    `Measured litres: ${batch.measured_litres.toFixed(2)}`,
    `Price per litre: KSh ${p.price_per_litre.toFixed(2)}`,
    `Amount: KSh ${p.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
    `Payment reference: ${p.payment_reference}`,
    '',
    'You can view and print your receipt in MaziwaTrack.',
  ].join('\n');

  if (!mailer) {
    console.log(`[email not configured] Would send to ${to}:\n${text}\n`);
    return false;
  }
  try {
    await mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: `Payment approved – ${batch.batch_number}`,
      text,
    });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}

router.post('/', async (req, res) => {
  const batchNumber = String(req.body.batch_number || '');
  const price = PRICE_PER_LITRE();

  const { paymentId, farmerEmail } = await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT b.batch_id, b.status, u.email FROM batches b JOIN users u ON u.user_id = b.farmer_id
       WHERE b.batch_number = ? FOR UPDATE`, [batchNumber]);
    if (!rows.length) throw Object.assign(new Error('Batch not found.'), { status: 404 });
    if (rows[0].status !== 'passed') {
      throw Object.assign(new Error('Only batches that passed testing can be paid.'), { status: 409 });
    }

    // Temporary reference, then the real one from the new payment_id: PAY-YYYYMMDD-0002
    const [r] = await conn.query(
      'INSERT INTO payments (batch_id, admin_id, price_per_litre, payment_reference) VALUES (?, ?, ?, ?)',
      [rows[0].batch_id, req.user.user_id, price, `TMP-${Date.now()}`]);
    const [[{ d }]] = await conn.query(
      "SELECT DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', ?), '%Y%m%d') AS d", [LOCAL_TZ]);
    const reference = `PAY-${d}-${String(r.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE payments SET payment_reference = ? WHERE payment_id = ?', [reference, r.insertId]);
    await conn.query("UPDATE batches SET status = 'paid' WHERE batch_id = ?", [rows[0].batch_id]);
    await audit(conn, req.user.user_id, 'APPROVE_PAYMENT', {
      table: 'batches', recordId: rows[0].batch_id,
      oldValue: { status: 'passed' },
      newValue: { status: 'paid', payment_reference: reference },
    });
    return { paymentId: r.insertId, farmerEmail: rows[0].email };
  });

  // Email after the payment is saved, so a mail problem never undoes an approval.
  let batch = await findBatch(pool, batchNumber);
  if (await emailFarmer(farmerEmail, batch)) {
    await pool.query('UPDATE payments SET email_sent = TRUE WHERE payment_id = ?', [paymentId]);
    batch = await findBatch(pool, batchNumber);
  }
  res.status(201).json(batch);
});

module.exports = router;
