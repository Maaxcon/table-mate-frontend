import { useState } from "react"
import { apiFetch } from "@/api/client"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { ReservationItem } from "../../types"
import "../ModifyReservationModal/ModifyReservationModal.css"
import { useWaiterStrings } from "../../strings"

interface MoveTableModalProps {
  reservation: ReservationItem
  tables: { public_id: string; public_number: string }[]
  onClose: () => void
  onSuccess: () => void
}

export function MoveTableModal({ reservation, tables, onClose, onSuccess }: MoveTableModalProps) {
  const [targetTableId, setTargetTableId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const waiterStrings = useWaiterStrings()
  const moveStrings = waiterStrings.moveModal
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
      const res = await apiFetch(
        `/api/reservations/reservations/${reservation.public_id}/move-table/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_id: targetTableId }),
        },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail ?? moveStrings.errors.generic)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : moveStrings.errors.generic)
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
            {moveStrings.title}
          </h2>
          <button
            type="button"
            className="modify-res__close"
            onClick={onClose}
            disabled={busy}
            aria-label={waiterStrings.common.close}
          >
            &times;
          </button>
        </div>

        <div className="modify-res__body">
          <div className="modify-res__field">
            <span className="modify-res__label">{moveStrings.labels.guest}</span>
            <span className="modify-res__value">
              {moveStrings.summary(reservation.name, reservation.table, reservation.guest_count)}
            </span>
          </div>

          {error && (
            <p className="modify-res__error" role="alert">
              {error}
            </p>
          )}

          <label className="modify-res__field">
            <span className="modify-res__label">{moveStrings.labels.target}</span>
            <select
              className="modify-res__input"
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              disabled={busy}
            >
              <option value="">{moveStrings.targetPlaceholder}</option>
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
            {moveStrings.buttons.cancel}
          </button>
          <button
            type="button"
            className="modify-res__btn modify-res__btn--primary"
            disabled={busy || !targetTableId}
            onClick={handleMove}
          >
            {busy ? moveStrings.buttons.moving : moveStrings.buttons.move}
          </button>
        </div>
      </div>
    </div>
  )
}
