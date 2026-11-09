// Every call to the backend goes through this file.
// Switch between sample data and the real backend with VITE_USE_MOCK in .env.
// The routes below are the frontend's expectation; agree them with the backend team.
import { mockApi } from './mockApi';
import { translateServer } from '../i18n/serverMessages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function request(path, options = {}) {
  const res = await fetch(API_URL + path, {
    credentials: 'include', // sends the httpOnly login cookie
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const query = (filters) => {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  return q ? `?${q}` : '';
};

const realApi = {
  // auth
  // login returns { twoFactor: true } (a code was emailed) or { user } (sample-data mode)
  login: (email, password) => post('/auth/login', { email, password }),
  verifyCode: (code) => post('/auth/verify-code', { code }).then((d) => d.user),
  resendCode: () => post('/auth/resend-code', {}),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => post('/auth/reset-password', { token, password }),
  register: (form) => post('/auth/register', form).then((d) => d.user),
  me: () => request('/auth/me').then((d) => d.user).catch(() => null),
  logout: () => post('/auth/logout', {}),
  getConfig: () => request('/config'), // { price_per_litre, cooperative_name }

  // farmer
  createBatch: (declared_litres) => post('/batches', { declared_litres }),
  myBatches: () => request('/batches/mine'),

  // grader
  batchesToTest: () => request('/batches?status=recorded'),
  verifyBatch: (batch_number, result) =>
    request(`/batches/${batch_number}/verify`, { method: 'PATCH', body: JSON.stringify(result) }),

  // admin
  listBatches: (filters = {}) => request(`/batches${query(filters)}`),
  approvePayment: (batch_number) => post('/payments', { batch_number }),
  resendReceipt: (reference) => post(`/payments/${reference}/resend`, {}),
  logReport: (type) => post('/reports/log', { type }),
  auditLogs: (filters = {}) => request(`/audit-logs${query(filters)}`),
};

// Messages from the backend (or the sample data) come in English: show them in the chosen language.
function translated(source) {
  const out = {};
  for (const [name, fn] of Object.entries(source)) {
    out[name] = async (...args) => {
      try {
        const res = await fn.apply(source, args);
        if (res && typeof res === 'object' && typeof res.message === 'string') {
          return { ...res, message: translateServer(res.message) };
        }
        return res;
      } catch (err) {
        if (err && typeof err.message === 'string') {
          err.serverMessage = err.message; // original English, for checks like /log in again/
          err.message = translateServer(err.message);
        }
        throw err;
      }
    };
  }
  return out;
}

export const api = translated(USE_MOCK ? mockApi : realApi);