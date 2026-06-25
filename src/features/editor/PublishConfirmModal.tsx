import Modal from "@/features/admin/components/Modal"
import "@/features/admin/components/styles/modal.css"

interface PublishConfirmModalProps {
  onConfirm: () => void
  onClose: () => void
  busy: boolean
}

export function PublishConfirmModal({ onConfirm, onClose, busy }: PublishConfirmModalProps) {
  return (
    <Modal
      title="Publish Layout"
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      backdropLabel="Cancel"
    >
      <p
        style={{
          padding: "0 24px",
          fontSize: "0.85rem",
          fontWeight: 600,
          lineHeight: 1.5,
          margin: "16px 0",
        }}
      >
        Publishing will instantly update all active waiter tablets.
        <br />
        Active sessions will remain valid.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "0 24px 24px",
          justifyContent: "flex-end",
        }}
      >
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--primary"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Publishing..." : "Publish"}
        </button>
      </div>
    </Modal>
  )
}
