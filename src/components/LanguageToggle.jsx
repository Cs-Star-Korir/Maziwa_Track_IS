// Language switch: EN | SW. Sits next to the appearance picker; the choice is remembered.
import { useTranslation } from 'react-i18next';
import { LANGS } from '../i18n';

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  return (
    <div className="theme-picker lang-picker" role="radiogroup" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l} type="button" role="radio" lang={l} aria-checked={i18n.language === l}
          title={t(`lang.${l}`)} aria-label={t(`lang.${l}`)} onClick={() => i18n.changeLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
