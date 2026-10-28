// Appearance control: Light / System / Dark.
// "System" (the default) follows the computer or phone setting and changes with it.
import { useEffect, useState } from 'react';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function readChoice() {
  try { return localStorage.getItem('theme') || 'system'; } catch { return 'system'; }
}

function apply(choice) {
  const mode = choice === 'system' ? (media.matches ? 'dark' : 'light') : choice;
  document.documentElement.setAttribute('data-bs-theme', mode);
}

const icons = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  ),
};

const labels = { light: 'Light', system: 'Match my device', dark: 'Dark' };

export default function ThemeToggle() {
  const [choice, setChoice] = useState(readChoice);

  // While on "System", switch automatically when the device switches.
  useEffect(() => {
    apply(choice);
    if (choice !== 'system') return undefined;
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [choice]);

  function pick(next) {
    try { localStorage.setItem('theme', next); } catch { /* storage blocked: works for this visit */ }
    setChoice(next);
  }

  return (
    <div className="theme-picker" role="radiogroup" aria-label="Appearance">
      {['light', 'system', 'dark'].map((c) => (
        <button key={c} type="button" role="radio" aria-checked={choice === c}
          title={labels[c]} aria-label={labels[c]} onClick={() => pick(c)}>
          {icons[c]}
        </button>
      ))}
    </div>
  );
}
