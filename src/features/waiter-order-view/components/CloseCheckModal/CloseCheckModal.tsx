import { useFocusTrap } from "@/hooks/useFocusTrap"
import "./CloseCheckModal.css"
import { useWaiterStrings } from "../../strings"

interface CloseCheckModalProps {
  busy?: boolean
  error?: string | null
  // Set once the backend has rejected a close attempt because items are
  // still unserved (409 code "unserved_items") — switches the dialog to a
  // "close anyway" prompt instead of the plain confirm.
  unservedCount?: number
  onConfirm: (force: boolean) => void
  onClose: () => void
}

// Confirms closing the check (the visit Session). There is no payment step yet,
// so this explains that and just frees the table on confirm. If a previous
// attempt was blocked by unserved items, offers to force it through instead.
export function CloseCheckModal({
  busy = false,
  error = null,
  unservedCount,
  onConfirm,
  onClose,
}: CloseCheckModalProps) {
  const strings = useWaiterStrings().closeCheck
  const isUnserved = typeof unservedCount === "number" && unservedCount > 0
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
            {strings.title}
          </h2>
          <button
            type="button"
            className="close-check__close"
            onClick={onClose}
            disabled={busy}
            aria-label={strings.closeAria}
          >
            &times;
          </button>
        </div>
        <div className="close-check__body">
          <p className="close-check__message">
            {isUnserved ? strings.unservedMessage(unservedCount) : strings.message}
          </p>
          {error && (
            <p className="close-check__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="close-check__actions">
          <button type="button" className="close-check__btn" onClick={onClose} disabled={busy}>
            {strings.cancel}
          </button>
          <button
            type="button"
            className="close-check__btn close-check__btn--primary"
            onClick={() => onConfirm(isUnserved)}
            disabled={busy}
          >
            {busy ? strings.confirming : isUnserved ? strings.confirmAnyway : strings.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
