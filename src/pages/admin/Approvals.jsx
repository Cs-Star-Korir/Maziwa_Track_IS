// W4 – Admin approvals: view batches, approve payment (FR4).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { litres, ksh, date, isMismatch } from '../../utils/format';

const statuses = ['passed', 'recorded', 'rejected', 'paid'];

export default function Approvals() {
  const { t } = useTranslation();
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

  // Sends the receipt email again for a paid batch whose email failed
  async function resend(b) {
    setMessage('');
    setError('');
    try {
      await api.resendReceipt(b.payment.payment_reference);
      setMessage(t('approvals.resent', { number: b.batch_number }));
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function approve() {
    setBusy(true);
    setError('');
    try {
      const b = await api.approvePayment(toApprove.batch_number);
      setMessage(`${t('approvals.approved', { ref: b.payment.payment_reference })} ${b.payment.email_sent ? t('approvals.emailSent') : t('approvals.emailFailed')}`);
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
    <Layout title={t('approvals.title')}>

      <form className="row g-2 align-items-end mb-3" onSubmit={(e) => { e.preventDefault(); setLoading(true); setError(''); load(); }}>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="status">{t('approvals.status')}</label>
          <select id="status" className="form-select" value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            <option value="">{t('common.all')}</option>
          </select>
        </div>
        <div className="col-sm-3">
          <label className="form-label small" htmlFor="date">{t('common.date')}</label>
          <input id="date" type="date" className="form-control" value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </div>
        <div className="col-sm-4">
          <label className="form-label small" htmlFor="farmer">{t('approvals.farmerName')}</label>
          <input id="farmer" className="form-control" placeholder={t('approvals.farmerName')} value={filters.farmer}
            onChange={(e) => setFilters({ ...filters, farmer: e.target.value })} />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-outline-primary w-100"><i className="fa-solid fa-filter me-1" />{t('common.filter')}</button>
        </div>
      </form>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading ? (
        <div className="spinner-border" />
      ) : batches.length === 0 ? (
        <p className="text-body-secondary">{t('approvals.none')}</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>{t('col.batchNo')}</th><th>{t('col.farmer')}</th><th>{t('col.date')}</th><th className="text-end">{t('col.declaredL')}</th>
                <th className="text-end">{t('col.measuredL')}</th><th>{t('col.flag')}</th><th>{t('col.status')}</th><th>{t('col.action')}</th>
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
                  <td>{isMismatch(b) ? <span className="badge text-bg-warning">{t('approvals.mismatch')}</span> : '–'}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    {b.status === 'passed'
                      ? <button className="btn btn-sm btn-primary" onClick={() => { setMessage(''); setToApprove(b); }}>{t('approvals.approve')}</button>
                      : <>
                          {b.payment?.payment_reference || '–'}
                          {b.payment && !b.payment.email_sent && (
                            <button className="btn btn-sm btn-outline-primary ms-2" onClick={() => resend(b)}>{t('approvals.resend')}</button>
                          )}
                        </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small text-body-secondary">
        {t('approvals.footnote')}
      </p>

      {toApprove && (
        <Modal title={t('approvals.modalTitle')} onClose={() => setToApprove(null)} footer={
          <>
            <button className="btn btn-primary" onClick={approve} disabled={busy}>{busy ? t('approvals.approving') : t('approvals.approve')}</button>
            <button className="btn btn-outline-secondary" onClick={() => setToApprove(null)}>{t('common.cancel')}</button>
          </>
        }>
          <table className="table table-sm mb-2">
            <tbody>
              <tr><th>{t('approvals.batch')}</th><td>{toApprove.batch_number}</td></tr>
              <tr><th>{t('approvals.farmer')}</th><td>{toApprove.farmer_name}</td></tr>
              <tr><th>{t('approvals.measured')}</th><td>{litres(toApprove.measured_litres)}</td></tr>
              <tr><th>{t('approvals.price')}</th><td>{price != null ? ksh(price) : '…'}</td></tr>
              <tr><th>{t('approvals.amount')}</th><td className="fw-bold">{price != null ? ksh(toApprove.measured_litres * price) : '…'}</td></tr>
            </tbody>
          </table>
          {isMismatch(toApprove) && (
            <div className="alert alert-warning py-2 mb-0">
              {t('approvals.mismatchWarn', { declared: litres(toApprove.declared_litres) })}
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}