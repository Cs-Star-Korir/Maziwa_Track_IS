// W2 – Farmer screen: record delivery, my deliveries, receipt (FR2).
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import DocHeader from '../../components/DocHeader';
import { api } from '../../services/api';
import { litres, ksh, date, capitalise } from '../../utils/format';

export default function FarmerHome() {
  const [declared, setDeclared] = useState('');
  const [saved, setSaved] = useState(null);     // the batch just recorded
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [receipt, setReceipt] = useState(null); // the batch whose receipt is open

  function load() {
    api.myBatches()
      .then(setBatches)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setSaved(null);
    const value = Number(declared);
    if (!declared || Number.isNaN(value) || value <= 0) {
      setFormError('Litres must be a number greater than 0');
      return;
    }
    setBusy(true);
    try {
      const b = await api.createBatch(+value.toFixed(2));
      setSaved(b);
      setDeclared('');
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="My deliveries">
      <div className="row g-4">
        {/* Record delivery */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body">
              <h2 className="mb-3">Record delivery</h2>
              <form onSubmit={handleSave} noValidate>
                <label htmlFor="declared" className="form-label">Declared litres</label>
                <input id="declared" type="number" min="0" step="0.01" placeholder="20.00"
                  className={`form-control mb-3 ${formError ? 'is-invalid' : ''}`}
                  value={declared} onChange={(e) => setDeclared(e.target.value)} />
                <button className="btn btn-primary w-100" disabled={busy}>
                  {busy ? 'Saving…' : 'Save delivery'}
                </button>
              </form>
              {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              {saved && (
                <div className="batch-ticket" role="status">
                  <div className="small">Saved. Your batch number is</div>
                  <div className="number">{saved.batch_number}</div>
                  <div className="small text-body-secondary">Give this number to the grader with your milk.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My deliveries */}
        <div className="col-lg-8">
          <h2 className="mb-3">Delivery history</h2>
          {loadError && <div className="alert alert-danger">{loadError}</div>}
          {loading ? (
            <div className="spinner-border" />
          ) : batches.length === 0 ? (
            <p className="text-body-secondary">No deliveries yet. Record your first delivery.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Batch no.</th><th>Date</th><th className="text-end">Declared (L)</th>
                    <th className="text-end">Measured (L)</th><th>Quality</th><th>Status</th><th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.batch_id}>
                      <td className="text-nowrap">{b.batch_number}</td>
                      <td className="text-nowrap">{date(b.delivered_at)}</td>
                      <td className="text-end">{litres(b.declared_litres)}</td>
                      <td className="text-end">{litres(b.measured_litres)}</td>
                      <td>{b.quality_result ? capitalise(b.quality_result) : '–'}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        {b.status === 'paid' && b.payment ? (
                          <button className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => setReceipt(b)}>
                            View receipt
                          </button>
                        ) : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receipt: only for paid batches */}
      {receipt && (
        <Modal title="Receipt" onClose={() => setReceipt(null)} footer={
          <>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <i className="fa-solid fa-print me-1" /> Print
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setReceipt(null)}>Close</button>
          </>
        }>
          <div className="print-area">
            <DocHeader title="Payment receipt" subtitle={date(receipt.payment.approved_at)} />
            <table className="table table-sm mb-0">
              <tbody>
                <tr><th>Farmer</th><td>{receipt.farmer_name}</td></tr>
                <tr><th>Batch</th><td>{receipt.batch_number}</td></tr>
                <tr><th>Measured litres</th><td>{litres(receipt.measured_litres)}</td></tr>
                <tr><th>Price per litre</th><td>{ksh(receipt.payment.price_per_litre)}</td></tr>
                <tr><th>Amount paid</th><td className="fw-bold">{ksh(receipt.payment.amount)}</td></tr>
                <tr><th>Payment ref</th><td>{receipt.payment.payment_reference}</td></tr>
                <tr><th>Date</th><td>{date(receipt.payment.approved_at)}</td></tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
