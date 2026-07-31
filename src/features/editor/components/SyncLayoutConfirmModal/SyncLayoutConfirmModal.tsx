import Modal from "@/features/admin/components/Modal"
import "@/features/admin/components/styles/modal.css"
import { useAdminStrings } from "@/features/admin/strings"

interface SyncLayoutConfirmModalProps {
  onConfirm: () => void
  onClose: () => void
  busy: boolean
}

export function SyncLayoutConfirmModal({ onConfirm, onClose, busy }: SyncLayoutConfirmModalProps) {
  const strings = useAdminStrings().floor.modals.sync

  return (
    <Modal
      title={strings.title}
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      backdropLabel={strings.cancel}
    >
      <p className="admin-modal__body">{strings.message}</p>
      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          {strings.cancel}
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--primary"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? strings.syncing : strings.confirm}
        </button>
      </div>
    </Modal>
  )
}
