// W1 – Login. No role selector: the role comes from the database after login.
// Two steps with the real backend: email + password, then the 6-digit code from the email (2FA).
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthCard from '../components/AuthCard';
import { useAuth, homeFor } from '../context/AuthContext';
import { api, USE_MOCK } from '../services/api';
import { resetMockData } from '../services/mockApi';

export default function Login() {
  const { t } = useTranslation();
  const { user, login, verifyCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('password'); // 'password' or 'code'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [codeSentTo, setCodeSentTo] = useState(''); // shown in the current language
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  // Step 1: email + password
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const d = await login(email, password);
      if (d.twoFactor) {
        setStep('code');
        setCodeSentTo(email.trim());
      } else {
        navigate(homeFor(d.user.role));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Step 2: the code from the email
  async function handleCode(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await verifyCode(code.trim());
      navigate(homeFor(u.role));
    } catch (err) {
      setError(err.message);
      if (needsLogin(err)) backToPassword(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setInfo('');
    try {
      const d = await api.resendCode();
      setCodeSentTo('');
      setInfo(d.message);
    } catch (err) {
      setError(err.message);
      if (needsLogin(err)) backToPassword(err.message);
    }
  }

  // The server says the halfway login is over (expired, too many tries): start again.
  const needsLogin = (err) => /log in again/i.test(err.serverMessage || err.message);

  function backToPassword(message = '') {
    setStep('password');
    setCode('');
    setPassword('');
    setInfo('');
    setCodeSentTo('');
    setError(message);
  }

  if (step === 'code') {
    return (
      <AuthCard title={t('login.codeTitle')}>
        {codeSentTo && <div className="alert alert-info py-2">{t('login.codeSent', { email: codeSentTo })}</div>}
        {info && <div className="alert alert-info py-2">{info}</div>}
        <form onSubmit={handleCode} noValidate>
          <div className="mb-3">
            <label htmlFor="code" className="form-label">{t('login.codeLabel')}</label>
            <input id="code" className="form-control form-control-lg text-center" inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} placeholder="123456" autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <button type="submit" className="btn btn-primary w-100" disabled={busy || code.length !== 6}>
            {busy ? t('login.checking') : t('login.verify')}
          </button>
        </form>

        <div className="mt-3 small d-flex justify-content-between">
          <button type="button" className="btn btn-link btn-sm p-0" onClick={resend}>{t('login.resend')}</button>
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => backToPassword()}>{t('login.otherAccount')}</button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('login.title')}>
      {location.state?.registered && (
        <div className="alert alert-success py-2">{t('login.registered')}</div>
      )}
      {location.state?.passwordReset && (
        <div className="alert alert-success py-2">{t('login.passwordReset')}</div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">{t('login.email')}</label>
          <input id="email" type="email" className="form-control" placeholder="jane@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">{t('login.password')}</label>
          <input id="password" type="password" className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-primary w-100" disabled={busy || !email || !password}>
          {busy ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <div className="mt-3 small">
        <div><Link to="/forgot-password">{t('login.forgot')}</Link></div>
        <div>{t('login.newFarmer')} <Link to="/register">{t('login.registerHere')}</Link></div>
        <div><Link to="/help">{t('login.needHelp')}</Link></div>
      </div>

      {USE_MOCK && (
        <div className="mt-3 small text-body-secondary border-top pt-2">
          {t('login.sampleAccounts')} <code>password123</code><br />
          wanjiku@example.com · grader@example.com · admin@example.com<br />
          <button type="button" className="btn btn-link btn-sm p-0"
            onClick={() => { resetMockData(); setError(''); setResetDone(true); }}>
            {t('login.resetSample')}
          </button>
          {resetDone && <span className="ms-2">{t('login.done')}</span>}
        </div>
      )}
    </AuthCard>
  );
}