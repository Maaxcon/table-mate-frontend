import { useEffect } from "react"
import "./modal.css"

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, busy])

  return (
    <div className="admin-modal__overlay admin-confirm__overlay">
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label="Cancel"
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div
        className="admin-modal admin-modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">{title}</h2>
        </div>

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
      </div>
    </div>
  )
}

export default ConfirmDialog
