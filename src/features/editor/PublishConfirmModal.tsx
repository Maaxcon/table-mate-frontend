import Modal from "@/features/admin/components/Modal"
import "@/features/admin/components/styles/modal.css"

interface PublishConfirmModalProps {
  onConfirm: () => void
  onClose: () => void
  busy: boolean
  warnings?: Array<{ table_number: string; reservation_count: number; message: string }>
}

export function PublishConfirmModal({
  onConfirm,
  onClose,
  busy,
  warnings,
}: PublishConfirmModalProps) {
  return (
    <Modal
      title="Publish Layout"
      onClose={onClose}
      role="alertdialog"
      showClose={!busy}
      closeDisabled={busy}
      backdropLabel="Cancel"
    >
      {warnings && warnings.length > 0 && (
        <div
          style={{
            padding: "0 24px",
            fontSize: "0.85rem",
            lineHeight: 1.5,
            margin: "16px 0",
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 8, color: "#e68a00" }}>
            {warnings.length} table(s) have active reservations:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{w.table_number}</strong>: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

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
