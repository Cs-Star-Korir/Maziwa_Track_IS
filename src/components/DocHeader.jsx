// Logo + cooperative name + title, used at the top of receipts and reports (FR5).
import { useTranslation } from 'react-i18next';

export default function DocHeader({ title, subtitle }) {
  const { t } = useTranslation();
  return (
    <div className="d-flex align-items-center gap-3 mb-3">
      <img src="/logo.svg" alt={t('common.logoAlt')} width="56" height="56" className="mt-logo" />
      <div>
        <div className="fw-bold">{t('common.cooperative')}</div>
        <div>{title}</div>
        {subtitle && <div className="small text-body-secondary">{subtitle}</div>}
      </div>
    </div>
  );
}
