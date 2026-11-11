// Reports logging and the read-only audit log (FR5). Test IDs (R6) match the end-to-end test plan.
import { beforeAll, describe, expect, it } from 'vitest';
import { hasDb, loginAs, recordDelivery, resetDb } from '../helpers/api.js';

const kenyaDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });

describe.skipIf(!hasDb)('reports and audit log', () => {
  let farmer; let admin;

  beforeAll(async () => {
    await resetDb();
    [farmer, admin] = await Promise.all(['farmer', 'admin'].map((who) => loginAs(who)));
    await recordDelivery(farmer, 11);
  });

  it('logs that a report was generated', async () => {
    const res = await admin.post('/api/reports/log').send({ type: 'Daily collection' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Report logged.');
  });

  it('requires a report type', async () => {
    const res = await admin.post('/api/reports/log').send({ type: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Report type is required.');
  });

  it('R6: the audit log lists actions newest first, with the user name and batch number', async () => {
    const res = await admin.get('/api/audit-logs');
    expect(res.status).toBe(200);
    const actions = res.body.map((l) => l.action);
    expect(actions[0]).toBe('GENERATE_REPORT');
    expect(actions).toEqual(expect.arrayContaining(['LOGIN', 'LOGIN_CODE_SENT', 'RECORD_DELIVERY']));
    const delivery = res.body.find((l) => l.action === 'RECORD_DELIVERY');
    expect(delivery).toMatchObject({ user_name: 'Wanjiku Mwangi', table_name: 'batches', new_value: { declared_litres: 11 } });
    expect(delivery.batch_number).toMatch(/^MT-\d{8}-\d{4}$/);
    expect(res.body.find((l) => l.action === 'GENERATE_REPORT').new_value).toEqual({ report: 'Daily collection' });
  });

  it('R6: filters by user, action and date', async () => {
    const byUser = (await admin.get('/api/audit-logs?user=Wanjiku Mwangi')).body;
    expect(byUser.length).toBeGreaterThan(0);
    expect(byUser.every((l) => l.user_name === 'Wanjiku Mwangi')).toBe(true);

    const byAction = (await admin.get('/api/audit-logs?action=LOGIN')).body;
    expect(byAction).toHaveLength(2);

    expect((await admin.get(`/api/audit-logs?date=${kenyaDate()}`)).body.length).toBeGreaterThan(0);
    expect((await admin.get('/api/audit-logs?date=2000-01-01')).body).toEqual([]);
  });

  it('refuses a badly written date filter', async () => {
    const res = await admin.get('/api/audit-logs?date=yesterday');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('"date" must be like 2026-10-19.');
  });

  it('is read only: there is no way to edit or delete entries through the API', async () => {
    expect((await admin.delete('/api/audit-logs')).status).toBe(404);
    expect((await admin.put('/api/audit-logs').send({})).status).toBe(404);
    expect((await admin.patch('/api/audit-logs/1').send({})).status).toBe(404);
  });
});
