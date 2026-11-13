// Login / Register / Help (wireframe W1): MaziwaTrack name, logo, then the form, centred.
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

export default function AuthCard({ title, children }) {
  const { t } = useTranslation();
  return (
    <div className="auth-page">
      <div className="auth-top"><LanguageToggle /><ThemeToggle /></div>
      <div className="auth-inner">
        <div className="d-flex align-items-center gap-2 mb-4">
          <img src="/logo.svg" alt={t('common.logoAlt')} width="40" height="40" className="mt-logo" />
          <span className="mt-brand fs-4">MaziwaTrack</span>
        </div>
        <h2 className="mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
