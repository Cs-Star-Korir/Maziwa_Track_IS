// @vitest-environment jsdom
// The backend answers in English; src/i18n/serverMessages.js shows those messages in Kiswahili.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { translateServer } from '../../src/i18n/serverMessages';

const ROOT = path.resolve(import.meta.dirname, '../..');

afterEach(() => i18n.changeLanguage('en'));

describe('translateServer', () => {
  it('leaves messages unchanged in English', () => {
    expect(translateServer('Incorrect email or password. Please try again.'))
      .toBe('Incorrect email or password. Please try again.');
  });

  it('translates known messages into Kiswahili', async () => {
    await i18n.changeLanguage('sw');
    expect(translateServer('Incorrect email or password. Please try again.'))
      .toBe('Barua pepe au nenosiri si sahihi. Tafadhali jaribu tena.');
    expect(translateServer('Batch not found.')).toBe('Bechi haikupatikana.');
  });

  it('translates messages with numbers in them', async () => {
    await i18n.changeLanguage('sw');
    expect(translateServer('That code is not right. 4 tries left.')).toBe('Msimbo huo si sahihi. Umebakiza majaribio 4.');
    expect(translateServer('Please wait 42 seconds before asking for a new code.'))
      .toBe('Tafadhali subiri sekunde 42 kabla ya kuomba msimbo mpya.');
    expect(translateServer('"from" must be a date like 2026-10-19.')).toBe('Weka tarehe kama 2026-10-19.');
    expect(translateServer('"date" must be like 2026-10-19.')).toBe('Weka tarehe kama 2026-10-19.');
  });

  it('turns browser network errors into a friendly message', async () => {
    await i18n.changeLanguage('sw');
    expect(translateServer('Failed to fetch')).toBe(i18n.t('errors.network'));
  });

  it('shows unknown messages as they are, and ignores empty values', async () => {
    await i18n.changeLanguage('sw');
    expect(translateServer('Something new from the server')).toBe('Something new from the server');
    expect(translateServer('')).toBe('');
    expect(translateServer(undefined)).toBeUndefined();
  });

  it('has a Kiswahili version of every fixed message the server can show', async () => {
    // collect the English messages written in server/ (message: '...' and new Error('...'))
    const dir = path.join(ROOT, 'server');
    const files = [...fs.readdirSync(dir).map((f) => path.join(dir, f)), ...fs.readdirSync(path.join(dir, 'routes')).map((f) => path.join(dir, 'routes', f))]
      .filter((f) => f.endsWith('.js'));
    const messages = new Set();
    for (const file of files) {
      const code = fs.readFileSync(file, 'utf8');
      for (const m of code.matchAll(/(?:message:\s*|new Error\()(['"])((?:(?!\1).)+)\1/g)) {
        if (!m[2].includes('${')) messages.add(m[2]);
      }
    }
    // Never shown on screen, so they need no translation
    const NOT_SHOWN = [
      'not a login token', // internal: caught and replaced by "Your session has expired..."
      'Logged out.',       // the app goes straight to the login page
      'Report logged.',    // the Reports page ignores this reply
    ];
    await i18n.changeLanguage('sw');
    const untranslated = [...messages].filter((m) => !NOT_SHOWN.includes(m) && translateServer(m) === m);
    expect(messages.size).toBeGreaterThan(25);
    expect(untranslated).toEqual([]);
  });
});
