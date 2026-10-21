// Login / Register / Help (wireframe W1): MaziwaTrack name, logo, then the form, centred.
import ThemeToggle from './ThemeToggle';

export default function AuthCard({ title, children }) {
  return (
    <div className="auth-page">
      <div className="auth-top"><ThemeToggle /></div>
      <div className="auth-inner">
        <div className="d-flex align-items-center gap-2 mb-4">
          <img src="/logo.svg" alt="MaziwaTrack logo" width="40" height="40" />
          <span className="mt-brand fs-4">MaziwaTrack</span>
        </div>
        <h2 className="mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
