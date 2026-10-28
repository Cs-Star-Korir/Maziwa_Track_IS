// Blocks a page unless the user is logged in with the right role.
import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center p-5"><div className="spinner-border" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
