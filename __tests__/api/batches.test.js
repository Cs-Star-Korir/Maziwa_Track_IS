// Milk deliveries: farmer records (FR2), grader tests (FR3), admin lists and filters (FR4).
// Test IDs (F1, G1, X1, ...) match the end-to-end test plan.
import { beforeAll, describe, expect, it } from 'vitest';
import { db, hasDb, loginAs, recordDelivery, resetDb, testBatch } from '../helpers/api.js';

// Today's date in Kenya as YYYYMMDD, as used in batch numbers
const kenyaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).replaceAll('-', '');

describe.skipIf(!hasDb)('deliveries and testing', () => {
  let farmer; let farmer2; let grader; let grader2; let admin;

  beforeAll(async () => {
    await resetDb();
    [farmer, farmer2, grader, grader2, admin] = await Promise.all(
      ['farmer', 'farmer2', 'grader', 'grader2', 'admin'].map((who) => loginAs(who)));
  });

  describe('farmer records a delivery (FR2)', () => {
    it('F2: gets a unique batch number MT-<today>-<id>, status Recorded', async () => {
      const res = await farmer.post('/api/batches').send({ declared_litres: 20.5 });
      expect(res.status).toBe(201);
      expect(res.body.batch_number).toBe(`MT-${kenyaToday()}-0001`);
      expect(res.body).toMatchObject({ declared_litres: 20.5, status: 'recorded', farmer_name: 'Wanjiku Mwangi', payment: null });
    });

    it('batch numbers keep counting up and are never reused', async () => {
      const a = await recordDelivery(farmer, 10);
      const b = await recordDelivery(farmer2, 12);
      expect(a.batch_number).toBe(`MT-${kenyaToday()}-0002`);
      expect(b.batch_number).toBe(`MT-${kenyaToday()}-0003`);
    });

    it('rounds litres to 2 decimal places', async () => {
      expect((await recordDelivery(farmer, 7.456)).declared_litres).toBe(7.46);
    });

    it.each([0, -5, '', 'abc', null])('F3: refuses invalid litres (%s)', async (litres) => {
      const res = await farmer.post('/api/batches').send({ declared_litres: litres });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Litres must be a number greater than 0');
    });

    it('F1: a farmer sees only their own deliveries, newest first', async () => {
      const res = await farmer.get('/api/batches/mine');
      expect(res.status).toBe(200);
      expect(res.body.every((b) => b.farmer_name === 'Wanjiku Mwangi')).toBe(true);
      const ids = res.body.map((b) => b.batch_id);
      expect(ids).toEqual([...ids].sort((x, y) => y - x));
    });

    it('records each delivery in the audit log', async () => {
      const { rows } = await db().query("SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'RECORD_DELIVERY'");
      expect(rows[0].n).toBe(4);
    });
  });

  describe('roles are enforced (X1, X2)', () => {
    it('only farmers can record deliveries', async () => {
      for (const agent of [grader, admin]) {
        const res = await agent.post('/api/batches').send({ declared_litres: 5 });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('You are not allowed to do this.');
      }
    });

    it('X1: a farmer cannot list all batches, test batches, or use admin routes', async () => {
      expect((await farmer.get('/api/batches')).status).toBe(403);
      expect((await farmer.patch('/api/batches/MT-20260101-0001/verify').send({})).status).toBe(403);
      expect((await farmer.post('/api/payments').send({})).status).toBe(403);
      expect((await farmer.get('/api/audit-logs')).status).toBe(403);
      expect((await farmer.post('/api/reports/log').send({ type: 'x' })).status).toBe(403);
    });

    it('X2: a grader cannot pay, read the audit log or log reports', async () => {
      expect((await grader.post('/api/payments').send({})).status).toBe(403);
      expect((await grader.get('/api/audit-logs')).status).toBe(403);
      expect((await grader.post('/api/reports/log').send({ type: 'x' })).status).toBe(403);
      expect((await grader.get('/api/batches/mine')).status).toBe(403);
    });

    it('an admin cannot test batches', async () => {
      const b = await recordDelivery(farmer, 3);
      expect((await admin.patch(`/api/batches/${b.batch_number}/verify`).send({ measured_litres: 3, quality_result: 'pass' })).status).toBe(403);
    });
  });

  describe('grader tests a batch (FR3)', () => {
    it('G1 + G5: the queue shows only Recorded batches, oldest first, the same for every grader', async () => {
      const res = await grader.get('/api/batches');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((b) => b.status === 'recorded')).toBe(true);
      const ids = res.body.map((b) => b.batch_id);
      expect(ids).toEqual([...ids].sort((x, y) => x - y));
      expect((await grader2.get('/api/batches')).body).toEqual(res.body);
    });

    it('graders always get the queue, even when asking for another status', async () => {
      const res = await grader.get('/api/batches?status=paid');
      expect(res.body.every((b) => b.status === 'recorded')).toBe(true);
    });

    it('G2: passing a batch with different measured litres saves both amounts', async () => {
      const b = await recordDelivery(farmer, 20);
      const tested = await testBatch(grader, b.batch_number, 19.5, 'pass', '  Clean sample  ');
      expect(tested).toMatchObject({
        status: 'passed', quality_result: 'pass', declared_litres: 20, measured_litres: 19.5,
        grader_notes: 'Clean sample', grader_id: 2,
      });
      expect(tested.tested_at).toBeTruthy();
    });

    it('G3: rejecting a batch sets status Rejected', async () => {
      const b = await recordDelivery(farmer2, 15);
      expect((await testBatch(grader, b.batch_number, 15, 'reject', 'Failed alcohol test')).status).toBe('rejected');
    });

    it('a batch cannot be tested twice (409)', async () => {
      const b = await recordDelivery(farmer, 8);
      await testBatch(grader, b.batch_number, 8);
      const again = await grader2.patch(`/api/batches/${b.batch_number}/verify`).send({ measured_litres: 8, quality_result: 'reject' });
      expect(again.status).toBe(409);
      expect(again.body.message).toBe('This batch has already been tested.');
    });

    it('an unknown batch number gives 404', async () => {
      const res = await grader.patch('/api/batches/MT-20990101-9999/verify').send({ measured_litres: 5, quality_result: 'pass' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Batch not found.');
    });

    it.each([0, -1, '', null])('G4: refuses invalid measured litres (%s)', async (measured) => {
      const b = await recordDelivery(farmer, 4);
      const res = await grader.patch(`/api/batches/${b.batch_number}/verify`).send({ measured_litres: measured, quality_result: 'pass' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Measured litres must be a number greater than 0');
    });

    it('requires a choice of Pass or Reject', async () => {
      const b = await recordDelivery(farmer, 4);
      const res = await grader.patch(`/api/batches/${b.batch_number}/verify`).send({ measured_litres: 4, quality_result: 'maybe' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Choose Pass or Reject.');
    });

    it('records the test with old and new values in the audit log', async () => {
      const { rows } = await db().query(
        "SELECT old_value, new_value FROM audit_logs WHERE action = 'TEST_BATCH' ORDER BY log_id LIMIT 1");
      expect(rows[0].old_value).toEqual({ status: 'recorded' });
      expect(rows[0].new_value).toEqual({ measured_litres: 19.5, quality_result: 'pass', status: 'passed' });
    });
  });

  describe('admin lists and filters batches (P6)', () => {
    it('sees every batch, newest first', async () => {
      const res = await admin.get('/api/batches');
      const { rows: [{ n }] } = await db().query('SELECT COUNT(*)::int AS n FROM batches');
      expect(res.body).toHaveLength(n);
      const ids = res.body.map((b) => b.batch_id);
      expect(ids).toEqual([...ids].sort((x, y) => y - x));
    });

    it('filters by status', async () => {
      const res = await admin.get('/api/batches?status=passed');
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((b) => b.status === 'passed')).toBe(true);
    });

    it('filters by farmer name, ignoring upper/lower case', async () => {
      const res = await admin.get('/api/batches?farmer=KAMAU');
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((b) => b.farmer_name === 'Kamau Njoroge')).toBe(true);
    });

    it('filters by date range (Kenya dates)', async () => {
      const today = kenyaToday().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      expect((await admin.get(`/api/batches?from=${today}&to=${today}`)).body.length).toBeGreaterThan(0);
      expect((await admin.get('/api/batches?to=2000-01-01')).body).toEqual([]);
    });

    it('refuses an unknown status or a badly written date', async () => {
      const s = await admin.get('/api/batches?status=lost');
      expect(s.status).toBe(400);
      expect(s.body.message).toBe('Unknown status.');
      const d = await admin.get('/api/batches?from=19-10-2026');
      expect(d.status).toBe(400);
      expect(d.body.message).toBe('"from" must be a date like 2026-10-19.');
    });

    it('treats a farmer filter as text, not SQL', async () => {
      const res = await admin.get(`/api/batches?farmer=${encodeURIComponent("x' OR '1'='1")}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
