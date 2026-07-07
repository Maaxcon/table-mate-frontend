import Modal from "@/features/admin/components/Modal"

interface ConfirmDeleteZoneModalProps {
  zoneName: string
  tableCount: number
  onConfirm: () => void
  onClose: () => void
  busy: boolean
}

export function ConfirmDeleteZoneModal({
  zoneName,
  tableCount,
  onConfirm,
  onClose,
  busy,
}: ConfirmDeleteZoneModalProps) {
  return (
    <Modal
      title="Delete zone"
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      className="admin-modal--confirm"
      overlayClassName="admin-confirm__overlay"
      backdropLabel="Cancel"
    >
      <p className="admin-modal__message">
        Are you sure you want to delete zone <strong>{zoneName}</strong>?
      </p>
      {tableCount > 0 && (
        <p className="admin-modal__message admin-modal__message--warning">
          This zone has {tableCount} table{tableCount !== 1 ? "s" : ""}. They will be deactivated
          when you publish.
        </p>
      )}
      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--danger"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  )
}
