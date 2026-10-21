// All the pages and who can open them.
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Help from './pages/Help';
import FarmerHome from './pages/farmer/FarmerHome';
import GraderHome from './pages/grader/GraderHome';
import Approvals from './pages/admin/Approvals';
import Reports from './pages/admin/Reports';
import AuditLog from './pages/admin/AuditLog';

export default function App() {
  return (
    <Routes>
      {/* W1: shared screens */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/help" element={<Help />} />

      {/* W2: farmer */}
      <Route path="/farmer" element={<ProtectedRoute role="farmer"><FarmerHome /></ProtectedRoute>} />

      {/* W3: grader */}
      <Route path="/grader" element={<ProtectedRoute role="grader"><GraderHome /></ProtectedRoute>} />

      {/* W4 and W5: admin */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><Approvals /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
