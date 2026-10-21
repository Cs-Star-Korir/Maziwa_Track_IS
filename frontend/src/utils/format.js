// Helpers so numbers and dates look the same on every screen.

export const litres = (n) => (n == null ? '–' : Number(n).toFixed(2));

export const ksh = (n) =>
  'KSh ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const date = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';

export const todayISO = () => new Date().toISOString().slice(0, 10);

// True when the grader's measured litres differ from what the farmer declared.
export const isMismatch = (b) =>
  b.measured_litres != null && Number(b.measured_litres) !== Number(b.declared_litres);

export const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '–');
