// Helpers so numbers and dates look the same on every screen.

export const litres = (n) => (n == null ? '–' : Number(n).toFixed(2));

export const ksh = (n) =>
  'KSh ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const date = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';

// Today's date as YYYY-MM-DD in the user's own time zone (toISOString would give the UTC date,
// which is still "yesterday" in Kenya between midnight and 3 a.m.).
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// True when the grader's measured litres differ from what the farmer declared.
export const isMismatch = (b) =>
  b.measured_litres != null && Number(b.measured_litres) !== Number(b.declared_litres);

export const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '–');
