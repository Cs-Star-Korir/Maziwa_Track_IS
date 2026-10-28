// Logo + cooperative name + title, used at the top of receipts and reports (FR5).
export default function DocHeader({ title, subtitle }) {
  return (
    <div className="d-flex align-items-center gap-3 mb-3">
      <img src="/logo.svg" alt="MaziwaTrack logo" width="56" height="56" />
      <div>
        <div className="fw-bold">MaziwaTrack Dairy Cooperative</div>
        <div>{title}</div>
        {subtitle && <div className="small text-body-secondary">{subtitle}</div>}
      </div>
    </div>
  );
}
