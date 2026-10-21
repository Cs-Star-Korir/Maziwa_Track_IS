// Fake version of the backend, used when VITE_USE_MOCK=true.
// It has the same functions as the real API in api.js, so pages do not care which one runs.
// Data is saved in the browser (localStorage) so you can test the whole flow:
// farmer records -> grader tests -> admin approves -> farmer sees receipt.
import * as seed from '../data/mockData';

const STORE_KEY = 'mt_mock_store';
const SESSION_KEY = 'mt_mock_user';
const MOCK_PASSWORD = 'password123';

// ---------- storage ----------
function freshStore() {
  return structuredClone({
    users: seed.users, batches: seed.batches, payments: seed.payments,
    auditLogs: seed.auditLogs, passwords: {},
  });
}

let db;
try { db = JSON.parse(localStorage.getItem(STORE_KEY)) || freshStore(); } catch { db = freshStore(); }

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* storage blocked: data lives until refresh */ }
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const nextId = (list, key) => Math.max(0, ...list.map((x) => x[key])) + 1;
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

function currentUser() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}

// Same rule as the backend: you must be logged in with the right role.
function requireRole(role) {
  const u = currentUser();
  if (!u) throw new Error('Please log in again.');
  if (role && u.role !== role) throw new Error('You are not allowed to do this.');
  return u;
}

function log(user_id, action, table_name = null, record_id = null, old_value = null, new_value = null) {
  db.auditLogs.push({
    log_id: nextId(db.auditLogs, 'log_id'), user_id, action, table_name, record_id,
    old_value, new_value, created_at: new Date().toISOString(),
  });
}

const safeUser = (u) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email, role: u.role });
const userName = (id) => db.users.find((u) => u.user_id === id)?.full_name || '–';

// A batch with the farmer's name and its payment (if any) attached,
// the same shape the backend returns from a JOIN.
function withDetails(b) {
  const p = db.payments.find((x) => x.batch_id === b.batch_id);
  return {
    ...b,
    farmer_name: userName(b.farmer_id),
    payment: p ? { ...p, amount: +(b.measured_litres * p.price_per_litre).toFixed(2) } : null,
  };
}

const findBatch = (batch_number) => db.batches.find((b) => b.batch_number === batch_number);

export const mockApi = {
  // ---------- auth ----------
  async login(email, password) {
    await wait();
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    const expected = u && (db.passwords[u.user_id] || MOCK_PASSWORD);
    if (!u || password !== expected) throw new Error('Incorrect email or password. Please try again.');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser(u)));
    log(u.user_id, 'LOGIN');
    save();
    return safeUser(u);
  },

  async register({ full_name, phone, email, password }) {
    await wait();
    if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase()))
      throw new Error('An account with this email already exists.');
    if (db.users.some((x) => x.phone === phone))
      throw new Error('An account with this phone number already exists.');
    const u = { user_id: nextId(db.users, 'user_id'), full_name, email, phone, role: 'farmer' };
    db.users.push(u);
    db.passwords[u.user_id] = password;
    log(u.user_id, 'REGISTER', 'users', u.user_id, null, { full_name, email });
    save();
    return safeUser(u);
  },

  async me() {
    await wait(50);
    return currentUser();
  },

  async logout() {
    const u = currentUser();
    if (u) { log(u.user_id, 'LOGOUT'); save(); }
    sessionStorage.removeItem(SESSION_KEY);
  },

  async getConfig() {
    return { price_per_litre: seed.PRICE_PER_LITRE, cooperative_name: 'MaziwaTrack Dairy Cooperative' };
  },

  // ---------- farmer ----------
  async createBatch(declared_litres) {
    await wait();
    const u = requireRole('farmer');
    if (!(declared_litres > 0)) throw new Error('Litres must be a number greater than 0');
    const batch_id = nextId(db.batches, 'batch_id');
    const b = {
      batch_id, batch_number: `MT-${today()}-${String(batch_id).padStart(4, '0')}`,
      farmer_id: u.user_id, declared_litres, status: 'recorded', delivered_at: new Date().toISOString(),
      grader_id: null, measured_litres: null, quality_result: null, grader_notes: null, tested_at: null,
    };
    db.batches.push(b);
    log(u.user_id, 'RECORD_DELIVERY', 'batches', batch_id, null, { declared_litres });
    save();
    return withDetails(b);
  },

  async myBatches() {
    await wait();
    const u = requireRole('farmer');
    return db.batches.filter((b) => b.farmer_id === u.user_id).map(withDetails).reverse();
  },

  // ---------- grader ----------
  async batchesToTest() {
    await wait();
    requireRole('grader');
    return db.batches.filter((b) => b.status === 'recorded').map(withDetails);
  },

  async verifyBatch(batch_number, { measured_litres, quality_result, grader_notes }) {
    await wait();
    const u = requireRole('grader');
    const b = findBatch(batch_number);
    if (!b) throw new Error('Batch not found.');
    if (b.status !== 'recorded') throw new Error('This batch has already been tested.');
    if (!(measured_litres > 0)) throw new Error('Measured litres must be a number greater than 0');
    if (!['pass', 'reject'].includes(quality_result)) throw new Error('Choose Pass or Reject.');
    const old = { status: b.status };
    Object.assign(b, {
      grader_id: u.user_id, measured_litres, quality_result, grader_notes: grader_notes || null,
      tested_at: new Date().toISOString(), status: quality_result === 'pass' ? 'passed' : 'rejected',
    });
    log(u.user_id, 'TEST_BATCH', 'batches', b.batch_id, old, { measured_litres, quality_result, status: b.status });
    save();
    return withDetails(b);
  },

  // ---------- admin ----------
  // filters: { status, from, to, farmer } – all optional. Dates are 'YYYY-MM-DD'.
  async listBatches(filters = {}) {
    await wait();
    requireRole('admin');
    const { status, from, to, farmer } = filters;
    return db.batches.map(withDetails).filter((b) => {
      const day = b.delivered_at.slice(0, 10);
      return (!status || b.status === status)
        && (!from || day >= from)
        && (!to || day <= to)
        && (!farmer || b.farmer_name.toLowerCase().includes(farmer.toLowerCase()));
    }).reverse();
  },

  async approvePayment(batch_number) {
    await wait();
    const u = requireRole('admin');
    const b = findBatch(batch_number);
    if (!b) throw new Error('Batch not found.');
    if (b.status !== 'passed') throw new Error('Only batches that passed testing can be paid.');
    const payment_id = nextId(db.payments, 'payment_id');
    const p = {
      payment_id, batch_id: b.batch_id, admin_id: u.user_id, price_per_litre: seed.PRICE_PER_LITRE,
      payment_reference: `PAY-${today()}-${String(payment_id).padStart(4, '0')}`,
      email_sent: true, // the real backend sends the email here
      approved_at: new Date().toISOString(),
    };
    db.payments.push(p);
    b.status = 'paid';
    log(u.user_id, 'APPROVE_PAYMENT', 'batches', b.batch_id, { status: 'passed' }, { status: 'paid', payment_reference: p.payment_reference });
    save();
    return withDetails(b);
  },

  async logReport(type) {
    const u = requireRole('admin');
    log(u.user_id, 'GENERATE_REPORT', null, null, null, { report: type });
    save();
  },

  // filters: { user, action, date } – all optional
  async auditLogs(filters = {}) {
    await wait();
    requireRole('admin');
    const { user, action, date } = filters;
    return db.auditLogs
      .map((l) => ({ ...l, user_name: userName(l.user_id), batch_number: l.table_name === 'batches' ? db.batches.find((b) => b.batch_id === l.record_id)?.batch_number : null }))
      .filter((l) => (!user || l.user_name === user) && (!action || l.action === action) && (!date || l.created_at.slice(0, 10) === date))
      .reverse();
  },
};

// Puts the sample data back to how it started (used by the link on the login page).
export function resetMockData() {
  db = freshStore();
  save();
}
