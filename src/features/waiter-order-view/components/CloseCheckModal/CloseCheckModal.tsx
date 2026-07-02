import { useFocusTrap } from "@/hooks/useFocusTrap"
import "./CloseCheckModal.css"

interface CloseCheckModalProps {
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

// Confirms closing the check (the visit Session). There is no payment step yet,
// so this explains that and just frees the table on confirm.
export function CloseCheckModal({
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: CloseCheckModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!busy) onClose()
    },
  })
  return (
    <div
      className="close-check"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="close-check__dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-check-title"
      >
        <div className="close-check__header">
          <h2 id="close-check-title" className="close-check__title">
            Close check
          </h2>
          <button
            type="button"
            className="close-check__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="close-check__body">
          <p className="close-check__message">
            There is no payment system yet. Closing the check will end the visit and free the table.
            Make sure the guests have paid before you continue.
          </p>
          {error && (
            <p className="close-check__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="close-check__actions">
          <button type="button" className="close-check__btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="close-check__btn close-check__btn--primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Closing…" : "Close check"}
          </button>
        </div>
      </div>
    </div>
  )
}
