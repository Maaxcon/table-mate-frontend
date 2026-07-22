import Modal from "@/features/admin/components/Modal"
import "@/features/admin/components/styles/modal.css"
import { useAdminStrings } from "@/features/admin/strings"

interface PublishConfirmModalProps {
  onConfirm: () => void
  onClose: () => void
  busy: boolean
}

export function PublishConfirmModal({ onConfirm, onClose, busy }: PublishConfirmModalProps) {
  const strings = useAdminStrings()
  const publishStrings = strings.floor.modals.publish
  return (
    <Modal
      title={publishStrings.title}
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      backdropLabel={publishStrings.cancel}
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
        {publishStrings.bodyLine1}
        <br />
        {publishStrings.bodyLine2}
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
          {publishStrings.cancel}
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--primary"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? publishStrings.confirming : publishStrings.confirm}
        </button>
      </div>
    </Modal>
  )
}
