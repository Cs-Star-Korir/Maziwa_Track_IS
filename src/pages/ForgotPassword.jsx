// Forgot password: the user enters their email and gets a reset link.
// Always shows the same message, so the form can't be used to find out who has an account.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthCard from '../components/AuthCard';
import { api } from '../services/api';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError(t('forgot.errEmail')); return; }
    setBusy(true);
    try {
      const d = await api.forgotPassword(email.trim().toLowerCase());
      setMessage(d.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={t('forgot.title')}>
      {message ? (
        <>
          <div className="alert alert-success py-2">{message}</div>
          <p className="small text-body-secondary">{t('forgot.expiry')}</p>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="text-body-secondary">{t('forgot.intro')}</p>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">{t('forgot.email')}</label>
            <input id="email" type="email" className="form-control" placeholder="jane@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={busy || !email}>
            {busy ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
      )}
      <div className="mt-3 small"><Link to="/login">{t('forgot.back')}</Link></div>
    </AuthCard>
  );
}