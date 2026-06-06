import Modal from "../Modal"
import "../styles/modal.css"

type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "danger"
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** A small modal that asks the user to confirm before a risky action runs. */
function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      role="alertdialog"
      showClose={false}
      closeDisabled={busy}
      overlayClassName="admin-confirm__overlay"
      className="admin-modal--confirm"
      backdropLabel="Cancel"
    >
      <p className="admin-modal__message">{message}</p>

      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`admin-modal__btn ${
            tone === "danger" ? "admin-modal__btn--danger" : "admin-modal__btn--primary"
          }`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
