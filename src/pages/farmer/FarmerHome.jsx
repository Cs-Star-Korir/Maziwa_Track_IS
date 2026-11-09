// W2 – Farmer screen: record delivery, my deliveries, receipt (FR2).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import DocHeader from '../../components/DocHeader';
import { api } from '../../services/api';
import { litres, ksh, date } from '../../utils/format';

export default function FarmerHome() {
  const { t } = useTranslation();
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
      setFormError(t('farmer.errLitres'));
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
    <Layout title={t('farmer.title')}>
      <div className="row g-4">
        {/* Record delivery */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body">
              <h2 className="mb-3">{t('farmer.record')}</h2>
              <form onSubmit={handleSave} noValidate>
                <label htmlFor="declared" className="form-label">{t('farmer.declared')}</label>
                <input id="declared" type="number" min="0" step="0.01" placeholder="20.00"
                  className={`form-control mb-3 ${formError ? 'is-invalid' : ''}`}
                  value={declared} onChange={(e) => setDeclared(e.target.value)} />
                <button className="btn btn-primary w-100" disabled={busy}>
                  {busy ? t('common.saving') : t('farmer.submit')}
                </button>
              </form>
              {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              {saved && (
                <div className="batch-ticket" role="status">
                  <div className="small">{t('farmer.savedNumber')}</div>
                  <div className="number">{saved.batch_number}</div>
                  <div className="small text-body-secondary">{t('farmer.giveNumber')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My deliveries */}
        <div className="col-lg-8">
          <h2 className="mb-3">{t('farmer.history')}</h2>
          {loadError && <div className="alert alert-danger">{loadError}</div>}
          {loading ? (
            <div className="spinner-border" />
          ) : batches.length === 0 ? (
            <p className="text-body-secondary">{t('farmer.empty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>{t('col.batchNo')}</th><th>{t('col.date')}</th><th className="text-end">{t('col.declaredL')}</th>
                    <th className="text-end">{t('col.measuredL')}</th><th>{t('col.quality')}</th><th>{t('col.status')}</th><th>{t('col.receipt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.batch_id}>
                      <td className="text-nowrap">{b.batch_number}</td>
                      <td className="text-nowrap">{date(b.delivered_at)}</td>
                      <td className="text-end">{litres(b.declared_litres)}</td>
                      <td className="text-end">{litres(b.measured_litres)}</td>
                      <td>{b.quality_result ? t(`qualityResult.${b.quality_result}`) : '–'}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        {b.status === 'paid' && b.payment ? (
                          <button className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => setReceipt(b)}>
                            {t('farmer.viewReceipt')}
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
        <Modal title={t('receipt.title')} onClose={() => setReceipt(null)} footer={
          <>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <i className="fa-solid fa-print me-1" /> {t('common.print')}
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setReceipt(null)}>{t('common.close')}</button>
          </>
        }>
          <div className="print-area">
            <DocHeader title={t('receipt.heading')} subtitle={date(receipt.payment.approved_at)} />
            <table className="table table-sm mb-0">
              <tbody>
                <tr><th>{t('receipt.farmer')}</th><td>{receipt.farmer_name}</td></tr>
                <tr><th>{t('receipt.batch')}</th><td>{receipt.batch_number}</td></tr>
                <tr><th>{t('receipt.measured')}</th><td>{litres(receipt.measured_litres)}</td></tr>
                <tr><th>{t('receipt.price')}</th><td>{ksh(receipt.payment.price_per_litre)}</td></tr>
                <tr><th>{t('receipt.amountPaid')}</th><td className="fw-bold">{ksh(receipt.payment.amount)}</td></tr>
                <tr><th>{t('receipt.ref')}</th><td>{receipt.payment.payment_reference}</td></tr>
                <tr><th>{t('receipt.date')}</th><td>{date(receipt.payment.approved_at)}</td></tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
