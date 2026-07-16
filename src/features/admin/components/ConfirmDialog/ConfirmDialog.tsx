import Modal from "@/features/admin/components/Modal"
import { useAdminStrings } from "@/features/admin/strings"
import "@/features/admin/components/styles/modal.css"

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
  confirmLabel,
  cancelLabel,
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const strings = useAdminStrings()
  const confirmText = confirmLabel ?? strings.common.confirm
  const cancelText = cancelLabel ?? strings.common.cancel

  return (
    <Modal
      title={title}
      onClose={onClose}
      role="alertdialog"
      showClose={false}
      closeDisabled={busy}
      overlayClassName="admin-confirm__overlay"
      className="admin-modal--confirm"
      backdropLabel={cancelText}
    >
      <p className="admin-modal__message">{message}</p>

      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          {cancelText}
        </button>
        <button
          type="button"
          className={`admin-modal__btn ${
            tone === "danger" ? "admin-modal__btn--danger" : "admin-modal__btn--primary"
          }`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "…" : confirmText}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
