// Keeps track of who is logged in and their role, for the whole app.
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, ask the backend if we are still logged in.
  useEffect(() => {
    api.me().then(setUser).finally(() => setLoading(false));
  }, []);

  // Step 1: email + password. Returns { twoFactor: true } when a code was emailed,
  // or { user } when the user is logged in straight away (sample-data mode).
  async function login(email, password) {
    const d = await api.login(email, password);
    if (d.user) setUser(d.user);
    return d;
  }

  // Step 2: the 6-digit code from the email. Logs the user in.
  async function verifyCode(code) {
    const u = await api.verifyCode(code);
    setUser(u);
    return u;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Where each role lands after logging in.
export const homeFor = (role) =>
  ({ farmer: '/farmer', grader: '/grader', admin: '/admin' })[role] || '/login';