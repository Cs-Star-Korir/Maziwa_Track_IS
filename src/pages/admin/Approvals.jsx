// W4 – Admin approvals: view batches, approve payment (FR4).
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { litres, ksh, date, isMismatch } from '../../utils/format';

const statuses = ['passed', 'recorded', 'rejected', 'paid'];

export default function Approvals() {
  const [filters, setFilters] = useState({ status: 'passed', date: '', farmer: '' });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toApprove, setToApprove] = useState(null);
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function load(f = filters) {
    api.listBatches({ status: f.status, from: f.date, to: f.date, farmer: f.farmer.trim() })
      .then(setBatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.getConfig().then((c) => setPrice(c.price_per_litre)).catch(() => {});
  }, []);

  async function approve() {
    setBusy(true);
    setError('');
    try {
      const b = await api.approvePayment(toApprove.batch_number);
      setMessage(`Payment approved. Ref ${b.payment.payment_reference}. ${b.payment.email_sent ? 'Email sent to farmer.' : 'Email could not be sent; please inform the farmer.'}`);
      setToApprove(null);
      load();
    } catch (err) {
      setError(err.message);
      setToApprove(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Approvals">

      <form className="row g-2 align-items-end mb-3" onSubmit={(e) => { e.preventDefault(); setLoading(true); setError(''); load(); }}>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="status">Status</label>
          <select id="status" className="form-select" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            {statuses.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            <option value="">All</option>
          </select>
        </div>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="date">Date</label>
          <input id="date" type="date" className="form-control" value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </div>
        <div className="col-sm-4">
          <label className="form-label small" htmlFor="farmer">Farmer name</label>
          <input id="farmer" className="form-control" placeholder="Farmer name" value={filters.farmer}
            onChange={(e) => setFilters({ ...filters, farmer: e.target.value })} />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-outline-primary w-100"><i className="fa-solid fa-filter me-1" />Filter</button>
        </div>
      </form>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? (
        <div className="spinner-border" />
      ) : batches.length === 0 ? (
        <p className="text-body-secondary">No batches match these filters.</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Batch no.</th><th>Farmer</th><th>Date</th><th className="text-end">Declared (L)</th>
                <th className="text-end">Measured (L)</th><th>Flag</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch_id} className={isMismatch(b) ? 'table-warning' : ''}>
                  <td className="text-nowrap">{b.batch_number}</td>
                  <td>{b.farmer_name}</td>
                  <td className="text-nowrap">{date(b.delivered_at)}</td>
                  <td className="text-end">{litres(b.declared_litres)}</td>
                  <td className="text-end">{litres(b.measured_litres)}</td>
                  <td>{isMismatch(b) ? <span className="badge text-bg-warning">Mismatch</span> : '–'}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    {b.status === 'passed'
                      ? <button className="btn btn-sm btn-primary" onClick={() => { setMessage(''); setToApprove(b); }}>Approve</button>
                      : b.payment?.payment_reference || '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small text-body-secondary">
        Mismatched batches are highlighted. Use the status filter to browse Recorded, Rejected and Paid batches.
      </p>

      {toApprove && (
        <Modal title="Approve payment" onClose={() => setToApprove(null)} footer={
          <>
            <button className="btn btn-primary" onClick={approve} disabled={busy}>{busy ? 'Approving…' : 'Approve'}</button>
            <button className="btn btn-outline-secondary" onClick={() => setToApprove(null)}>Cancel</button>
          </>
        }>
          <table className="table table-sm mb-2">
            <tbody>
              <tr><th>Batch</th><td>{toApprove.batch_number}</td></tr>
              <tr><th>Farmer</th><td>{toApprove.farmer_name}</td></tr>
              <tr><th>Measured litres</th><td>{litres(toApprove.measured_litres)}</td></tr>
              <tr><th>Price per litre</th><td>{price != null ? ksh(price) : '…'}</td></tr>
              <tr><th>Amount</th><td className="fw-bold">{price != null ? ksh(toApprove.measured_litres * price) : '…'}</td></tr>
            </tbody>
          </table>
          {isMismatch(toApprove) && (
            <div className="alert alert-warning py-2 mb-0">
              Litres differ from the declared amount ({litres(toApprove.declared_litres)} L). Payment is on measured litres.
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
