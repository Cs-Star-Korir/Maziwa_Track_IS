// W5 – Audit log (FR5). Read only: entries cannot be edited or deleted.
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { dateTime } from '../../utils/format';

const actions = ['LOGIN', 'LOGOUT', 'REGISTER', 'RECORD_DELIVERY', 'TEST_BATCH', 'APPROVE_PAYMENT', 'GENERATE_REPORT'];

// Turns {status: 'passed'} into "status: passed" for the Old → New column.
const show = (v) => (v ? Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', ') : '–');

export default function AuditLog() {
  const [filters, setFilters] = useState({ user: '', action: '', date: '' });
  const [logs, setLogs] = useState([]);
  const [userNames, setUserNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(f = filters) {
    api.auditLogs(f)
      .then((rows) => {
        setLogs(rows);
        if (!f.user && !f.action && !f.date) setUserNames([...new Set(rows.map((r) => r.user_name))].sort());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  const set = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  return (
    <Layout title="Audit log">

      <form className="row g-2 align-items-end mb-3" onSubmit={(e) => { e.preventDefault(); setLoading(true); setError(''); load(); }}>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="user">User</label>
          <select id="user" name="user" className="form-select" value={filters.user} onChange={set}>
            <option value="">All users</option>
            {userNames.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="action">Action</label>
          <select id="action" name="action" className="form-select" value={filters.action} onChange={set}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="adate">Date</label>
          <input id="adate" name="date" type="date" className="form-control" value={filters.date} onChange={set} />
        </div>
        <div className="col-sm-3">
          <button className="btn btn-outline-primary w-100"><i className="fa-solid fa-filter me-1" />Filter</button>
        </div>
      </form>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading ? (
        <div className="spinner-border" />
      ) : logs.length === 0 ? (
        <p className="text-body-secondary">No audit entries match these filters.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>Old → New</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.log_id}>
                  <td className="text-nowrap">{dateTime(l.created_at)}</td>
                  <td>{l.user_name}</td>
                  <td><code>{l.action}</code></td>
                  <td className="text-nowrap">{l.batch_number || '–'}</td>
                  <td className="small">{show(l.old_value)} → {show(l.new_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small text-body-secondary">Read only: audit entries cannot be edited or deleted.</p>
    </Layout>
  );
}
