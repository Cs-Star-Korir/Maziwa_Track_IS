// POST /api/payments – admin approves payment for a passed batch; the farmer is emailed (FR4).
const express = require('express');
const { sendMail, escapeHtml, layout } = require('../mail');
const { pool, withTransaction, audit, LOCAL_TZ } = require('../db');
const { requireAuth, requireRole } = require('./auth');
const { findBatch } = require('./batches');
const { PRICE_PER_LITRE, COOPERATIVE_NAME } = require('./config');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// Builds the receipt (plain text + HTML) and sends it. Returns true if the email was sent.
// Without mail settings the email is printed in the terminal and email_sent stays false.
async function emailFarmer(to, batch) {
  const p = batch.payment;
  const rows = [
    ['Payment reference', p.payment_reference],
    ['Batch', batch.batch_number],
    ['Delivered', new Date(batch.delivered_at).toLocaleDateString('en-KE',
      { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' })],
    ['Measured litres', batch.measured_litres.toFixed(2)],
    ['Price per litre', `KSh ${p.price_per_litre.toFixed(2)}`],
    ['Amount', `KSh ${p.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
  ];

  // Plain-text version, for email apps that don't show HTML
  const text = [
    `Hello ${batch.farmer_name},`, '',
    `Your milk payment has been approved by ${COOPERATIVE_NAME()}.`,
    ...rows.map(([label, value]) => `${label}: ${value}`), '',
    'You can view and print your receipt in MaziwaTrack.',
  ].join('\n');

  // HTML version. Email apps ignore <style> blocks, so every style is written inline.
  const cell = 'padding:6px 8px;border-bottom:1px solid #e5e7eb;';
  const table = rows.map(([label, value], i) => `<tr>
      <td style="${cell}color:#6b7280">${label}</td>
      <td style="${cell}text-align:right;${i === rows.length - 1 ? 'font-weight:bold' : ''}">${escapeHtml(value)}</td>
    </tr>`).join('');
  const html = layout('Payment receipt', `
    <p>Hello ${escapeHtml(batch.farmer_name)},</p>
    <p>Your milk payment has been approved.</p>
    <table style="border-collapse:collapse;width:100%">${table}</table>
    <p style="margin-top:16px">You can view and print your receipt in MaziwaTrack.</p>`);

  return sendMail({ to, subject: `Payment receipt – ${batch.batch_number}`, text, html });
}

router.post('/', async (req, res) => {
  const batchNumber = String(req.body.batch_number || '');
  const price = PRICE_PER_LITRE();

  const { paymentId, farmerEmail } = await withTransaction(async (conn) => {
    const { rows } = await conn.query(
      `SELECT b.batch_id, b.status, u.email FROM batches b JOIN users u ON u.user_id = b.farmer_id
       WHERE b.batch_number = $1 FOR UPDATE OF b`, [batchNumber]);
    if (!rows.length) throw Object.assign(new Error('Batch not found.'), { status: 404 });
    if (rows[0].status !== 'passed') {
      throw Object.assign(new Error('Only batches that passed testing can be paid.'), { status: 409 });
    }

    // Temporary reference, then the real one from the new payment_id: PAY-YYYYMMDD-0002
    const { rows: [pay] } = await conn.query(
      `INSERT INTO payments (batch_id, admin_id, price_per_litre, payment_reference)
       VALUES ($1, $2, $3, $4) RETURNING payment_id`,
      [rows[0].batch_id, req.user.user_id, price, `TMP-${Date.now()}`]);
    const { rows: [{ d }] } = await conn.query(
      "SELECT to_char(now() AT TIME ZONE $1, 'YYYYMMDD') AS d", [LOCAL_TZ]);
    const reference = `PAY-${d}-${String(pay.payment_id).padStart(4, '0')}`;
    await conn.query('UPDATE payments SET payment_reference = $1 WHERE payment_id = $2', [reference, pay.payment_id]);
    await conn.query("UPDATE batches SET status = 'paid' WHERE batch_id = $1", [rows[0].batch_id]);
    await audit(conn, req.user.user_id, 'APPROVE_PAYMENT', {
      table: 'batches', recordId: rows[0].batch_id,
      oldValue: { status: 'passed' },
      newValue: { status: 'paid', payment_reference: reference },
    });
    return { paymentId: pay.payment_id, farmerEmail: rows[0].email };
  });

  // Email after the payment is saved, so a mail problem never undoes an approval.
  let batch = await findBatch(pool, batchNumber);
  if (await emailFarmer(farmerEmail, batch)) {
    await pool.query('UPDATE payments SET email_sent = TRUE WHERE payment_id = $1', [paymentId]);
    batch = await findBatch(pool, batchNumber);
  }
  res.status(201).json(batch);
});

// POST /api/payments/:payment_reference/resend – send the receipt again, e.g. after an email failure
router.post('/:payment_reference/resend', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.payment_id, b.batch_id, b.batch_number, u.email
     FROM payments p
     JOIN batches b ON b.batch_id = p.batch_id
     JOIN users u ON u.user_id = b.farmer_id
     WHERE p.payment_reference = $1`, [req.params.payment_reference]);
  if (!rows.length) return res.status(404).json({ message: 'Payment not found.' });
  const { payment_id, batch_id, batch_number, email } = rows[0];

  const batch = await findBatch(pool, batch_number);
  if (!(await emailFarmer(email, batch))) {
    return res.status(502).json({ message: 'Email could not be sent. Check the mail settings and try again.' });
  }
  await pool.query('UPDATE payments SET email_sent = TRUE WHERE payment_id = $1', [payment_id]);
  await audit(pool, req.user.user_id, 'RESEND_RECEIPT', {
    table: 'batches', recordId: batch_id,
    newValue: { payment_reference: req.params.payment_reference },
  });
  res.json(await findBatch(pool, batch_number));
});

module.exports = router;