// Reset password: opened from the link in the email (…/reset-password?token=…).
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthCard from '../components/AuthCard';
import { api } from '../services/api';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('reset.errShort')); return; }
    if (password !== confirm) { setError(t('reset.errMismatch')); return; }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      navigate('/login', { state: { passwordReset: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title={t('reset.titleIncomplete')}>
        <div className="alert alert-danger py-2">{t('reset.incomplete')}</div>
        <div className="small"><Link to="/forgot-password">{t('reset.askNew')}</Link></div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('reset.title')}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">{t('reset.newPassword')}</label>
          <input id="password" type="password" className="form-control" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          <div className="form-text">{t('reset.hint')}</div>
        </div>
        <div className="mb-3">
          <label htmlFor="confirm" className="form-label">{t('reset.confirm')}</label>
          <input id="confirm" type="password" className="form-control" autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <button type="submit" className="btn btn-primary w-100" disabled={busy || !password || !confirm}>
          {busy ? t('reset.submitting') : t('reset.submit')}
        </button>
      </form>
      <div className="mt-3 small d-flex justify-content-between">
        <Link to="/forgot-password">{t('reset.askNew')}</Link>
        <Link to="/login">{t('reset.back')}</Link>
      </div>
    </AuthCard>
  );
}