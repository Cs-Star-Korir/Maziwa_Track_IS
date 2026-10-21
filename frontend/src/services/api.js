// Every call to the backend goes through this file.
// Switch between sample data and the real backend with VITE_USE_MOCK in .env.
// The routes below are the frontend's expectation; agree them with the backend team.
import { mockApi } from './mockApi';

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
  login: (email, password) => post('/auth/login', { email, password }).then((d) => d.user),
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
  logReport: (type) => post('/reports/log', { type }),
  auditLogs: (filters = {}) => request(`/audit-logs${query(filters)}`),
};

export const api = USE_MOCK ? mockApi : realApi;
