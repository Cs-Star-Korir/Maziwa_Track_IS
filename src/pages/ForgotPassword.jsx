// Forgot password: the user enters their email and gets a reset link.
// Always shows the same message, so the form can't be used to find out who has an account.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
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
    <AuthCard title="Forgot password">
      {message ? (
        <>
          <div className="alert alert-success py-2">{message}</div>
          <p className="small text-body-secondary">The link expires in 30 minutes. Check your spam folder if it doesn't arrive.</p>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="text-body-secondary">Enter the email you registered with and we'll send you a link to set a new password.</p>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className="form-control" placeholder="jane@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <div className="mt-3 small"><Link to="/login">Back to login</Link></div>
    </AuthCard>
  );
}