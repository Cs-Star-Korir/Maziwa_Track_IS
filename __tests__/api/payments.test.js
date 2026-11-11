// Admin approves payment and the farmer is emailed a receipt (FR4).
// Test IDs (P2, P3, ...) match the end-to-end test plan.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  db, hasDb, inbox, lastMailTo, loginAs, recordDelivery, resetDb, smtp, testBatch, USERS,
} from '../helpers/api.js';

const kenyaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).replaceAll('-', '');

describe.skipIf(!hasDb)('payments and receipts', () => {
  let farmer; let grader; let admin;

  // A delivery that has been tested: returns its batch number
  async function testedBatch(declared, measured, result = 'pass') {
    const b = await recordDelivery(farmer, declared);
    await testBatch(grader, b.batch_number, measured, result);
    return b.batch_number;
  }

  beforeAll(async () => {
    await resetDb();
    [farmer, grader, admin] = await Promise.all(['farmer', 'grader', 'admin'].map((who) => loginAs(who)));
  });

  afterEach(() => smtp().refuse(false));

  it('P2: approving a passed batch pays on measured litres × price, marks it Paid and gives a reference', async () => {
    const number = await testedBatch(20, 19.5);
    const res = await admin.post('/api/payments').send({ batch_number: number });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.payment).toMatchObject({
      payment_reference: `PAY-${kenyaToday()}-0001`,
      price_per_litre: 50,
      amount: 975, // 19.5 L × KSh 50
      email_sent: true,
    });
  });

  it('P3: the farmer is emailed a receipt with the reference, litres and amount', async () => {
    const number = await testedBatch(10, 10);
    const since = inbox().length;
    const { body } = await admin.post('/api/payments').send({ batch_number: number });
    const mail = lastMailTo(USERS.farmer.email, since);
    expect(mail.subject).toBe(`Payment receipt – ${number}`);
    expect(mail.text).toContain(`Payment reference: ${body.payment.payment_reference}`);
    expect(mail.text).toContain('Measured litres: 10.00');
    expect(mail.text).toContain('Amount: KSh 500.00');
    expect(mail.html).toContain('MaziwaTrack Dairy Cooperative');
  });

  it('F4: the farmer sees the payment on their own deliveries (for the receipt)', async () => {
    const res = await farmer.get('/api/batches/mine');
    const paid = res.body.filter((b) => b.status === 'paid');
    expect(paid.length).toBe(2);
    expect(paid.every((b) => b.payment && b.payment.payment_reference.startsWith('PAY-'))).toBe(true);
  });

  it('P7: a Rejected batch cannot be paid', async () => {
    const number = await testedBatch(10, 10, 'reject');
    const res = await admin.post('/api/payments').send({ batch_number: number });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Only batches that passed testing can be paid.');
  });

  it('a batch that has not been tested cannot be paid', async () => {
    const b = await recordDelivery(farmer, 5);
    expect((await admin.post('/api/payments').send({ batch_number: b.batch_number })).status).toBe(409);
  });

  it('a batch cannot be paid twice', async () => {
    const number = await testedBatch(6, 6);
    expect((await admin.post('/api/payments').send({ batch_number: number })).status).toBe(201);
    const again = await admin.post('/api/payments').send({ batch_number: number });
    expect(again.status).toBe(409);
    const { rows } = await db().query(
      'SELECT COUNT(*)::int AS n FROM payments p JOIN batches b USING (batch_id) WHERE b.batch_number = $1', [number]);
    expect(rows[0].n).toBe(1);
  });

  it('an unknown batch gives 404', async () => {
    const res = await admin.post('/api/payments').send({ batch_number: 'MT-20990101-9999' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Batch not found.');
  });

  it('P4: if the email fails, the payment is still saved as Paid with email_sent false', async () => {
    const number = await testedBatch(12, 12);
    smtp().refuse(true);
    const res = await admin.post('/api/payments').send({ batch_number: number });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('paid');
    expect(res.body.payment.email_sent).toBe(false);
  });

  it('P5: "Resend receipt" fails clearly while email is down, then works and sets email_sent', async () => {
    const { rows: [p] } = await db().query(
      'SELECT payment_reference FROM payments WHERE email_sent = FALSE ORDER BY payment_id DESC LIMIT 1');

    smtp().refuse(true);
    const failed = await admin.post(`/api/payments/${p.payment_reference}/resend`);
    expect(failed.status).toBe(502);
    expect(failed.body.message).toBe('Email could not be sent. Check the mail settings and try again.');

    smtp().refuse(false);
    const since = inbox().length;
    const ok = await admin.post(`/api/payments/${p.payment_reference}/resend`);
    expect(ok.status).toBe(200);
    expect(ok.body.payment.email_sent).toBe(true);
    expect(lastMailTo(USERS.farmer.email, since).subject).toMatch(/^Payment receipt – MT-/);
  });

  it('resending an unknown reference gives 404', async () => {
    const res = await admin.post('/api/payments/PAY-20990101-9999/resend');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Payment not found.');
  });

  it('approvals and resends are recorded in the audit log', async () => {
    const { rows } = await db().query(
      "SELECT action, old_value, new_value FROM audit_logs WHERE action IN ('APPROVE_PAYMENT', 'RESEND_RECEIPT') ORDER BY log_id");
    expect(rows.filter((r) => r.action === 'APPROVE_PAYMENT')).toHaveLength(4);
    expect(rows.filter((r) => r.action === 'RESEND_RECEIPT')).toHaveLength(1);
    expect(rows[0].old_value).toEqual({ status: 'passed' });
    expect(rows[0].new_value).toMatchObject({ status: 'paid' });
  });
});
