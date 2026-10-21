// Simple pop-up window (Bootstrap modal styling, controlled by React state).
export default function Modal({ title, onClose, children, footer }) {
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5">{title}</h2>
              <button type="button" className="btn-close no-print" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer no-print">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
