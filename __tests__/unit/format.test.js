// @vitest-environment jsdom
// Number and date formatting used on every screen (src/utils/format.js).
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import { capitalise, date, dateTime, isMismatch, ksh, litres, todayISO } from '../../src/utils/format';

afterEach(async () => {
  await i18n.changeLanguage('en');
  vi.useRealTimers();
});

describe('litres', () => {
  it('always shows 2 decimal places', () => {
    expect(litres(20)).toBe('20.00');
    expect(litres('7.5')).toBe('7.50');
    expect(litres(19.456)).toBe('19.46');
  });

  it('shows a dash when there is no value yet (batch not tested)', () => {
    expect(litres(null)).toBe('–');
    expect(litres(undefined)).toBe('–');
  });
});

describe('ksh', () => {
  it('formats Kenya Shillings with thousands separators and 2 decimals', () => {
    expect(ksh(975)).toBe('KSh 975.00');
    expect(ksh(1234567.5)).toBe('KSh 1,234,567.50');
    expect(ksh('50')).toBe('KSh 50.00');
  });
});

describe('date and dateTime', () => {
  const iso = '2026-10-19T09:30:00+03:00';

  it('show day, short month and year in English', () => {
    expect(date(iso)).toMatch(/^19 Oct 2026$/);
  });

  it('follow the chosen language (Kiswahili month names)', async () => {
    await i18n.changeLanguage('sw');
    expect(date(iso)).toMatch(/Okt/);
  });

  it('show a dash for an empty value', () => {
    expect(date(null)).toBe('–');
    expect(dateTime('')).toBe('–');
  });

  it('dateTime includes the time', () => {
    expect(dateTime(iso)).toMatch(/\d{2}:\d{2}/);
  });
});

describe('todayISO', () => {
  it('uses the local date, not the UTC date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 1, 15)); // 9 Nov, 01:15 local time
    expect(todayISO()).toBe('2026-11-09');
  });
});

describe('isMismatch', () => {
  it('is true only when the measured litres differ from the declared litres', () => {
    expect(isMismatch({ declared_litres: 20, measured_litres: 19.5 })).toBe(true);
    expect(isMismatch({ declared_litres: 20, measured_litres: 20 })).toBe(false);
    expect(isMismatch({ declared_litres: '20.00', measured_litres: 20 })).toBe(false);
  });

  it('is false while the batch has not been measured', () => {
    expect(isMismatch({ declared_litres: 20, measured_litres: null })).toBe(false);
  });
});

describe('capitalise', () => {
  it('capitalises the first letter, or shows a dash', () => {
    expect(capitalise('passed')).toBe('Passed');
    expect(capitalise('')).toBe('–');
  });
});
