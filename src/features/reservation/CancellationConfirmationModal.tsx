import { useFocusTrap } from "@/hooks/useFocusTrap"
import { bookStrings } from "./strings"
import "./CancellationConfirmationModal.css"

interface CancellationConfirmationModalProps {
  isSubmitting?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CancellationConfirmationModal({
  isSubmitting = false,
  onConfirm,
  onClose,
}: CancellationConfirmationModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!isSubmitting) onClose()
    },
  })

  return (
    <div
      className="cancel-confirm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div
        className="cancel-confirm__dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-confirm-title"
      >
        <div className="cancel-confirm__header">
          <h2 className="cancel-confirm__title" id="cancel-confirm-title">
            {bookStrings.cancel.title}
          </h2>
          <button
            type="button"
            className="cancel-confirm__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={bookStrings.cancel.close}
          >
            &times;
          </button>
        </div>
        <div className="cancel-confirm__body">
          <p className="cancel-confirm__message">{bookStrings.cancel.message}</p>
        </div>
        <div className="cancel-confirm__actions">
          <button
            type="button"
            className="cancel-confirm__btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {bookStrings.cancel.keep}
          </button>
          <button
            type="button"
            className="cancel-confirm__btn cancel-confirm__btn--danger"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? bookStrings.cancel.submitting : bookStrings.cancel.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
