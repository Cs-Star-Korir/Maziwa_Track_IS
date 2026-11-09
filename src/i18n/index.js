// English / Kiswahili translations (react-i18next).
// Every on-screen text lives in en.json and sw.json under the same keys.
// The chosen language is remembered in this browser (localStorage "lang").
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import sw from './sw.json';

export const LANGS = ['en', 'sw'];

function savedLang() {
  try {
    const l = localStorage.getItem('lang');
    return LANGS.includes(l) ? l : 'en';
  } catch {
    return 'en';
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, sw: { translation: sw } },
  lng: savedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

function applyLang(lng) {
  document.documentElement.lang = lng;
  try { localStorage.setItem('lang', lng); } catch { /* private mode: ignore */ }
}
applyLang(i18n.language);
i18n.on('languageChanged', applyLang);

// Locale for dates and numbers in the current language.
export const locale = () => (i18n.language === 'sw' ? 'sw-KE' : 'en-GB');

export default i18n;
