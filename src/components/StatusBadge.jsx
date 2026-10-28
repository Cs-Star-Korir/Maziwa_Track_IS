// Coloured label for a batch status: Recorded, Passed, Rejected, Paid.
const colours = {
  recorded: 'text-bg-secondary',
  passed: 'text-bg-primary',
  rejected: 'text-bg-danger',
  paid: 'text-bg-success',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${colours[status] || 'text-bg-light'}`}>
      {status ? status[0].toUpperCase() + status.slice(1) : '–'}
    </span>
  );
}
