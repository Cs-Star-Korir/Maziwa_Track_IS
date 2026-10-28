// W1 – Login. No role selector: the role comes from the database after login.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { useAuth, homeFor } from '../context/AuthContext';
import { USE_MOCK } from '../services/api';
import { resetMockData } from '../services/mockApi';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(homeFor(u.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Login">
      {location.state?.registered && (
        <div className="alert alert-success py-2">Account created. Please log in.</div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input id="email" type="email" className="form-control" placeholder="jane@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input id="password" type="password" className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button type="submit" className="btn btn-primary w-100" disabled={busy || !email || !password}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="mt-3 small">
        <div>New farmer? <Link to="/register">Register here</Link></div>
        <div><Link to="/help">Need help?</Link></div>
      </div>

      {USE_MOCK && (
        <div className="mt-3 small text-body-secondary border-top pt-2">
          Sample accounts (password <code>password123</code>):<br />
          wanjiku@example.com · grader@example.com · admin@example.com<br />
          <button type="button" className="btn btn-link btn-sm p-0"
            onClick={() => { resetMockData(); setError(''); setResetDone(true); }}>
            Reset sample data
          </button>
          {resetDone && <span className="ms-2">Done.</span>}
        </div>
      )}
    </AuthCard>
  );
}
