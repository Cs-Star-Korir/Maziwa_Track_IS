// Runs before each UI test file: adds screen matchers (toBeInTheDocument, ...) and starts
// every test in English with empty browser storage.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import i18n from '../../src/i18n';

// jsdom has no window.matchMedia; the appearance picker needs it to read the device setting.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());
