// Coloured label for a batch status: Recorded, Passed, Rejected, Paid.
import { useTranslation } from 'react-i18next';

const colours = {
  recorded: 'text-bg-secondary',
  passed: 'text-bg-primary',
  rejected: 'text-bg-danger',
  paid: 'text-bg-success',
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${colours[status] || 'text-bg-light'}`}>
      {status ? t(`status.${status}`, { defaultValue: status }) : '–'}
    </span>
  );
}
