// Menu bar inside the blue header band: logo + "Role: Name" on the left, links on the right.
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const roleLabel = { farmer: 'Farmer', grader: 'Grader', admin: 'Admin' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar navbar-expand-md mt-navbar" data-bs-theme="dark">
      <div className="container">
        <span className="navbar-brand d-flex align-items-center gap-2">
          <img src="/logo.svg" alt="" width="30" height="30" />
          <span className="mt-brand">MaziwaTrack</span>
          {user && (
            <span className="mt-who d-none d-md-inline">{roleLabel[user.role]}: {user.full_name}</span>
          )}
        </span>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#mainNav" aria-label="Menu">
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto align-items-md-center gap-md-1">
            {user && (
              <li className="nav-item d-md-none mt-who py-2">{roleLabel[user.role]}: {user.full_name}</li>
            )}
            {user?.role === 'admin' && (
              <>
                <li className="nav-item"><NavLink end className="nav-link" to="/admin">Approvals</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/admin/reports">Reports</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/admin/audit">Audit log</NavLink></li>
              </>
            )}
            <li className="nav-item"><NavLink className="nav-link" to="/help">Help</NavLink></li>
            {user && (
              <li className="nav-item">
                <button className="btn btn-link nav-link" onClick={handleLogout}>Log out</button>
              </li>
            )}
            <li className="nav-item ms-md-2 py-2 py-md-0"><ThemeToggle /></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
