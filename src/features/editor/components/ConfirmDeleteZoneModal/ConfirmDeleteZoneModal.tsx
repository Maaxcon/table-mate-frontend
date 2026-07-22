import Modal from "@/features/admin/components/Modal"
import { useAdminStrings } from "@/features/admin/strings"

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
  const strings = useAdminStrings()
  const deleteStrings = strings.floor.modals.deleteZone
  return (
    <Modal
      title={deleteStrings.title}
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      className="admin-modal--confirm"
      overlayClassName="admin-confirm__overlay"
      backdropLabel={deleteStrings.cancel}
    >
      <p className="admin-modal__message">{deleteStrings.message(zoneName)}</p>
      {tableCount > 0 && (
        <p className="admin-modal__message admin-modal__message--warning">
          {deleteStrings.warning(tableCount)}
        </p>
      )}
      <div className="admin-modal__actions">
        <button type="button" className="admin-modal__btn" onClick={onClose} disabled={busy}>
          {deleteStrings.cancel}
        </button>
        <button
          type="button"
          className="admin-modal__btn admin-modal__btn--danger"
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? deleteStrings.confirming : deleteStrings.confirm}
        </button>
      </div>
    </Modal>
  )
}
