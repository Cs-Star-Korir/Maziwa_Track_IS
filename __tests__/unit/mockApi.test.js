// @vitest-environment jsdom
// Sample-data mode (src/services/mockApi.js) follows the same business rules as the real API,
// so demos without a backend behave like the real system.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApi, resetMockData } from '../../src/services/mockApi';

const PASSWORD = 'password123';
const as = (email) => mockApi.login(email, PASSWORD);

beforeEach(async () => {
  // sample-data mode waits ~250 ms to feel like a network; skip the wait in tests
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });
  sessionStorage.clear();
  resetMockData();
});

afterEach(() => vi.restoreAllMocks());

describe('sample-data login', () => {
  it('logs in straight away (no emailed code in this mode)', async () => {
    const res = await as('wanjiku@example.com');
    expect(res.user).toEqual({ user_id: 3, full_name: 'Wanjiku Mwangi', email: 'wanjiku@example.com', role: 'farmer' });
    expect(await mockApi.me()).toEqual(res.user);
  });

  it('refuses a wrong password', async () => {
    await expect(mockApi.login('wanjiku@example.com', 'nope')).rejects.toThrow('Incorrect email or password');
  });

  it('says that login codes and password reset need the real backend', async () => {
    await expect(mockApi.verifyCode('123456')).rejects.toThrow('only used with the real backend');
    await expect(mockApi.resetPassword('t', 'Password123')).rejects.toThrow('needs the real backend');
  });

  it('logout ends the session', async () => {
    await as('wanjiku@example.com');
    await mockApi.logout();
    expect(await mockApi.me()).toBeNull();
  });
});

describe('sample-data registration', () => {
  it('registers a farmer who can then log in with their own password', async () => {
    const u = await mockApi.register({ full_name: 'New Farmer', phone: '0799000111', email: 'new@example.com', password: 'Secret123' });
    expect(u.role).toBe('farmer');
    expect((await mockApi.login('new@example.com', 'Secret123')).user.email).toBe('new@example.com');
  });

  it('refuses a duplicate email or phone', async () => {
    await expect(mockApi.register({ full_name: 'X', phone: '0711111111', email: 'WANJIKU@example.com', password: 'x' }))
      .rejects.toThrow('email already exists');
    await expect(mockApi.register({ full_name: 'X', phone: '0712345678', email: 'x@example.com', password: 'x' }))
      .rejects.toThrow('phone number already exists');
  });
});

describe('sample-data full flow: farmer → grader → admin', () => {
  it('records, tests, pays and shows the receipt amount', async () => {
    await as('wanjiku@example.com');
    const b = await mockApi.createBatch(20);
    expect(b.batch_number).toMatch(/^MT-\d{8}-\d{4}$/);
    expect(b.status).toBe('recorded');

    await as('grader@example.com');
    expect((await mockApi.batchesToTest()).map((x) => x.batch_number)).toContain(b.batch_number);
    const tested = await mockApi.verifyBatch(b.batch_number, { measured_litres: 19.5, quality_result: 'pass' });
    expect(tested.status).toBe('passed');

    await as('admin@example.com');
    const paid = await mockApi.approvePayment(b.batch_number);
    expect(paid.status).toBe('paid');
    expect(paid.payment.amount).toBe(975);

    await as('wanjiku@example.com');
    const mine = await mockApi.myBatches();
    expect(mine[0]).toMatchObject({ batch_number: b.batch_number, status: 'paid' });
  });
});

describe('sample-data rules', () => {
  it('checks roles like the real API', async () => {
    await as('wanjiku@example.com');
    await expect(mockApi.listBatches()).rejects.toThrow('You are not allowed to do this.');
    await mockApi.logout();
    await expect(mockApi.myBatches()).rejects.toThrow('Please log in again.');
  });

  it('refuses invalid litres', async () => {
    await as('wanjiku@example.com');
    await expect(mockApi.createBatch(0)).rejects.toThrow('Litres must be a number greater than 0');
  });

  it('a batch cannot be tested twice and only passed batches can be paid', async () => {
    await as('grader@example.com');
    await expect(mockApi.verifyBatch('MT-20261016-0002', { measured_litres: 15, quality_result: 'pass' }))
      .rejects.toThrow('already been tested');
    await as('admin@example.com');
    await expect(mockApi.approvePayment('MT-20261016-0002')).rejects.toThrow('Only batches that passed testing can be paid.');
  });

  it('admin filters by status and farmer name', async () => {
    await as('admin@example.com');
    const passed = await mockApi.listBatches({ status: 'passed' });
    expect(passed.length).toBeGreaterThan(0);
    expect(passed.every((b) => b.status === 'passed')).toBe(true);
    const john = await mockApi.listBatches({ farmer: 'john' });
    expect(john.every((b) => b.farmer_name === 'John Kiprop')).toBe(true);
  });

  it('every action is written to the audit log', async () => {
    await as('wanjiku@example.com');
    await mockApi.createBatch(5);
    await as('admin@example.com');
    const actions = (await mockApi.auditLogs()).map((l) => l.action);
    expect(actions.slice(0, 3)).toEqual(['LOGIN', 'RECORD_DELIVERY', 'LOGIN']);
  });

  it('"Reset sample data" puts everything back', async () => {
    await as('wanjiku@example.com');
    await mockApi.createBatch(5);
    resetMockData();
    await as('admin@example.com');
    expect(await mockApi.listBatches()).toHaveLength(6);
  });
});
