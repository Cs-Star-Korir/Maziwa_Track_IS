// Menu bar inside the blue header band: logo + "Role: Name" on the left, links on the right.
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const who = user && `${t(`role.${user.role}`)}: ${user.full_name}`;

  return (
    <nav className="navbar navbar-expand-md mt-navbar" data-bs-theme="dark">
      <div className="container">
        <span className="navbar-brand d-flex align-items-center gap-2">
          {/* white version of the logo: it sits on the blue band */}
          <img src="/logo-white.svg" alt="" width="30" height="30" />
          <span className="mt-brand">MaziwaTrack</span>
          {user && <span className="mt-who d-none d-md-inline">{who}</span>}
        </span>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#mainNav" aria-label={t('nav.menu')}>
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto align-items-md-center gap-md-1">
            {user && <li className="nav-item d-md-none mt-who py-2">{who}</li>}
            {user?.role === 'admin' && (
              <>
                <li className="nav-item"><NavLink end className="nav-link" to="/admin">{t('nav.approvals')}</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/admin/reports">{t('nav.reports')}</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/admin/audit">{t('nav.audit')}</NavLink></li>
              </>
            )}
            <li className="nav-item"><NavLink className="nav-link" to="/help">{t('nav.help')}</NavLink></li>
            {user && (
              <li className="nav-item">
                <button className="btn btn-link nav-link" onClick={handleLogout}>{t('nav.logout')}</button>
              </li>
            )}
            <li className="nav-item ms-md-2 py-2 py-md-0 d-flex gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
