import "./ConfirmCancelModal.css"

interface ConfirmCancelModalProps {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmCancelModal({
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmCancelModalProps) {
  return (
    <div
      className="confirm-cancel"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onClose()
      }}
    >
      <div className="confirm-cancel__dialog" role="dialog" aria-modal="true">
        <div className="confirm-cancel__header">
          <h2 className="confirm-cancel__title">{title}</h2>
          <button
            type="button"
            className="confirm-cancel__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="confirm-cancel__body">
          <p className="confirm-cancel__message">{message}</p>
          {error && (
            <p className="confirm-cancel__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="confirm-cancel__actions">
          <button type="button" className="confirm-cancel__btn" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-cancel__btn confirm-cancel__btn--primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
