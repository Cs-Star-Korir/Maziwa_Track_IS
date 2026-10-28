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

  async function login(email, password) {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Where each role lands after logging in.
export const homeFor = (role) =>
  ({ farmer: '/farmer', grader: '/grader', admin: '/admin' })[role] || '/login';
