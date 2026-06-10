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
  return (
    <div
      className="cancel-confirm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) onClose()
      }}
    >
      <div className="cancel-confirm__dialog" role="dialog" aria-modal="true">
        <div className="cancel-confirm__header">
          <h2 className="cancel-confirm__title">Cancel reservation</h2>
          <button
            type="button"
            className="cancel-confirm__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="cancel-confirm__body">
          <p className="cancel-confirm__message">
            Are you sure you want to cancel this reservation?
          </p>
        </div>
        <div className="cancel-confirm__actions">
          <button
            type="button"
            className="cancel-confirm__btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Keep
          </button>
          <button
            type="button"
            className="cancel-confirm__btn cancel-confirm__btn--danger"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cancelling..." : "Cancel reservation"}
          </button>
        </div>
      </div>
    </div>
  )
}
