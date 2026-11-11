// @vitest-environment jsdom
// English / Kiswahili translations (NFR3): both languages must cover the same texts,
// and every text the screens ask for must exist.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import sw from '../../src/i18n/sw.json';
import i18n, { locale } from '../../src/i18n';

const ROOT = path.resolve(import.meta.dirname, '../..');

// { a: { b: 'x' } } -> { 'a.b': 'x' }
const flatten = (obj, prefix = '') => Object.entries(obj).reduce((all, [k, v]) => (
  typeof v === 'object' ? { ...all, ...flatten(v, `${prefix}${k}.`) } : { ...all, [`${prefix}${k}`]: v }), {});
const placeholders = (text) => (text.match(/{{\s*\w+\s*}}/g) || []).map((p) => p.replace(/\s/g, '')).sort();

const enFlat = flatten(en);
const swFlat = flatten(sw);

// Every .js/.jsx file in src/
const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return sourceFiles(full);
  return /\.(jsx?)$/.test(e.name) ? [full] : [];
});

afterEach(() => i18n.changeLanguage('en'));

describe('translation files', () => {
  it('English and Kiswahili have exactly the same keys', () => {
    const missingInSw = Object.keys(enFlat).filter((k) => !(k in swFlat));
    const extraInSw = Object.keys(swFlat).filter((k) => !(k in enFlat));
    expect(missingInSw).toEqual([]);
    expect(extraInSw).toEqual([]);
  });

  it('no text is empty', () => {
    const empty = [...Object.entries(enFlat), ...Object.entries(swFlat)].filter(([, v]) => !String(v).trim());
    expect(empty).toEqual([]);
  });

  it('both languages use the same {{placeholders}} in each text', () => {
    const different = Object.keys(enFlat).filter((k) => placeholders(enFlat[k]).join() !== placeholders(swFlat[k] || '').join());
    expect(different).toEqual([]);
  });

  it('every t("...") key used in the screens exists in en.json', () => {
    const used = new Set();
    for (const file of sourceFiles(path.join(ROOT, 'src'))) {
      const code = fs.readFileSync(file, 'utf8');
      // only plain keys: t('farmer.title') – keys built at run time (t(`status.${s}`)) are checked below
      for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z]+(?:\.[a-zA-Z_]+)+)'/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !(k in enFlat) && !(`${k}_one` in enFlat));
    expect(used.size).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });

  it('has a name for every batch status, quality result, role and report type', () => {
    for (const s of ['recorded', 'passed', 'rejected', 'paid']) expect(enFlat[`status.${s}`]).toBeTruthy();
    for (const q of ['pass', 'reject']) {
      expect(enFlat[`quality.${q}`]).toBeTruthy();
      expect(enFlat[`qualityResult.${q}`]).toBeTruthy();
    }
    for (const r of ['farmer', 'grader', 'admin']) expect(enFlat[`role.${r}`]).toBeTruthy();
    for (const t of ['daily', 'payments', 'statement', 'mismatch']) expect(enFlat[`reports.type.${t}`]).toBeTruthy();
  });
});

describe('switching language', () => {
  it('translates texts, plurals and placeholders', async () => {
    expect(i18n.t('nav.logout')).toBe('Log out');
    expect(i18n.t('reports.totalBatches', { count: 1 })).toBe('Total (1 batch)');
    expect(i18n.t('reports.totalBatches', { count: 3 })).toBe('Total (3 batches)');
    await i18n.changeLanguage('sw');
    expect(i18n.t('nav.logout')).toBe('Toka');
    expect(i18n.t('grader.testBatch', { number: 'MT-20261019-0007' })).toBe('Kagua bechi MT-20261019-0007');
  });

  it('uses Kenyan Kiswahili dates in Kiswahili and British English dates otherwise', async () => {
    expect(locale()).toBe('en-GB');
    await i18n.changeLanguage('sw');
    expect(locale()).toBe('sw-KE');
  });
});
