// Sample data used while the backend is not ready (VITE_USE_MOCK=true).
// It matches the database tables: users, batches, payments, audit_logs.
// Every sample account uses the password: password123

export const PRICE_PER_LITRE = 50;

export const users = [
  { user_id: 1, full_name: 'Grace Njeri', email: 'admin@example.com', phone: '0700000001', role: 'admin' },
  { user_id: 2, full_name: 'Peter Otieno', email: 'grader@example.com', phone: '0700000002', role: 'grader' },
  { user_id: 3, full_name: 'Wanjiku Mwangi', email: 'wanjiku@example.com', phone: '0712345678', role: 'farmer' },
  { user_id: 4, full_name: 'John Kiprop', email: 'john@example.com', phone: '0722345678', role: 'farmer' },
  { user_id: 5, full_name: 'Mary Achieng', email: 'mary@example.com', phone: '0733345678', role: 'farmer' },
];

export const batches = [
  { batch_id: 1, batch_number: 'MT-20261016-0002', farmer_id: 3, declared_litres: 15, status: 'rejected', delivered_at: '2026-10-16T07:30:00', grader_id: 2, measured_litres: 15, quality_result: 'reject', grader_notes: 'Failed alcohol test', tested_at: '2026-10-16T09:00:00' },
  { batch_id: 2, batch_number: 'MT-20261017-0003', farmer_id: 3, declared_litres: 22, status: 'paid', delivered_at: '2026-10-17T07:40:00', grader_id: 2, measured_litres: 21.5, quality_result: 'pass', grader_notes: '', tested_at: '2026-10-17T09:10:00' },
  { batch_id: 3, batch_number: 'MT-20261018-0004', farmer_id: 5, declared_litres: 30, status: 'passed', delivered_at: '2026-10-18T07:20:00', grader_id: 2, measured_litres: 30, quality_result: 'pass', grader_notes: '', tested_at: '2026-10-18T09:05:00' },
  { batch_id: 4, batch_number: 'MT-20261018-0005', farmer_id: 3, declared_litres: 18, status: 'passed', delivered_at: '2026-10-18T07:35:00', grader_id: 2, measured_litres: 18, quality_result: 'pass', grader_notes: '', tested_at: '2026-10-18T09:15:00' },
  { batch_id: 5, batch_number: 'MT-20261019-0006', farmer_id: 4, declared_litres: 12.5, status: 'recorded', delivered_at: '2026-10-19T07:50:00', grader_id: null, measured_litres: null, quality_result: null, grader_notes: null, tested_at: null },
  { batch_id: 6, batch_number: 'MT-20261019-0007', farmer_id: 3, declared_litres: 20, status: 'recorded', delivered_at: '2026-10-19T08:42:00', grader_id: null, measured_litres: null, quality_result: null, grader_notes: null, tested_at: null },
];

export const payments = [
  { payment_id: 1, batch_id: 2, admin_id: 1, price_per_litre: 50, payment_reference: 'PAY-20261018-0009', email_sent: true, approved_at: '2026-10-18T14:05:00' },
];

export const auditLogs = [
  { log_id: 1, user_id: 3, action: 'LOGIN', table_name: null, record_id: null, old_value: null, new_value: null, created_at: '2026-10-19T08:30:00' },
  { log_id: 2, user_id: 3, action: 'RECORD_DELIVERY', table_name: 'batches', record_id: 6, old_value: null, new_value: { declared_litres: 20 }, created_at: '2026-10-19T08:42:00' },
];
