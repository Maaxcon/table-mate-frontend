import { useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { ReservationItem } from "../../types"
import "../ModifyReservationModal/ModifyReservationModal.css"

interface MoveTableModalProps {
  reservation: ReservationItem
  tables: { public_id: string; public_number: string }[]
  onClose: () => void
  onSubmit: (targetTableId: string) => void | Promise<void>
}

export function MoveTableModal({ reservation, tables, onClose, onSubmit }: MoveTableModalProps) {
  const [targetTableId, setTargetTableId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!busy) onClose()
    },
  })

  const otherTables = tables.filter((t) => t.public_number !== reservation.table)

  const handleMove = async () => {
    if (!targetTableId) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(targetTableId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move table")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modify-res"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div
        className="modify-res__dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-table-title"
      >
        <div className="modify-res__header">
          <h2 id="move-table-title" className="modify-res__title">
            Move Reservation
          </h2>
          <button
            type="button"
            className="modify-res__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="modify-res__body">
          <div className="modify-res__field">
            <span className="modify-res__label">Guest</span>
            <span className="modify-res__value">
              {reservation.name} &middot; Table {reservation.table} &middot;{" "}
              {reservation.guest_count} guests
            </span>
          </div>

          {error && (
            <p className="modify-res__error" role="alert">
              {error}
            </p>
          )}

          <label className="modify-res__field">
            <span className="modify-res__label">Target table</span>
            <select
              className="modify-res__input"
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              disabled={busy}
            >
              <option value="">Select a table…</option>
              {otherTables.map((t) => (
                <option key={t.public_id} value={t.public_id}>
                  {t.public_number}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="modify-res__actions">
          <button type="button" className="modify-res__btn" onClick={onClose} disabled={busy}>
            CANCEL
          </button>
          <button
            type="button"
            className="modify-res__btn modify-res__btn--primary"
            disabled={busy || !targetTableId}
            onClick={handleMove}
          >
            {busy ? "MOVING…" : "MOVE"}
          </button>
        </div>
      </div>
    </div>
  )
}
