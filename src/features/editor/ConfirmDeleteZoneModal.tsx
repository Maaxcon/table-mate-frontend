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
  const canDelete = tableCount === 0

  return (
    <Modal
      title={canDelete ? "Delete zone" : "Cannot delete zone"}
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      className="admin-modal--confirm"
      overlayClassName="admin-confirm__overlay"
      backdropLabel="Cancel"
    >
      {canDelete ? (
        <>
          <p className="admin-modal__message">
            Are you sure you want to delete zone <strong>{zoneName}</strong>?
          </p>
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
        </>
      ) : (
        <>
          <p className="admin-modal__message">
            Zone <strong>{zoneName}</strong> has {tableCount} table{tableCount !== 1 ? "s" : ""}.
            Remove or move all tables before deleting this zone.
          </p>
          <div className="admin-modal__actions">
            <button
              type="button"
              className="admin-modal__btn admin-modal__btn--primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
