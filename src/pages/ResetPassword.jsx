// Reset password: opened from the link in the email (…/reset-password?token=…).
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { api } from '../services/api';

export default function ResetPassword() {
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
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
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
      <AuthCard title="Reset password">
        <div className="alert alert-danger py-2">This link is incomplete. Open the link from your email again, or ask for a new one.</div>
        <div className="small"><Link to="/forgot-password">Ask for a new link</Link></div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">New password</label>
          <input id="password" type="password" className="form-control" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          <div className="form-text">At least 8 characters.</div>
        </div>
        <div className="mb-3">
          <label htmlFor="confirm" className="form-label">Confirm new password</label>
          <input id="confirm" type="password" className="form-control" autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <button type="submit" className="btn btn-primary w-100" disabled={busy || !password || !confirm}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
      <div className="mt-3 small d-flex justify-content-between">
        <Link to="/forgot-password">Ask for a new link</Link>
        <Link to="/login">Back to login</Link>
      </div>
    </AuthCard>
  );
}