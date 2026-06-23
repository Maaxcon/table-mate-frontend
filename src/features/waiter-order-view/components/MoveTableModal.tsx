import { useState } from "react"
import { apiFetch } from "@/api/client"
import type { ReservationItem } from "../data/waiterTypes"
import "./ModifyReservationModal.css"

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

  const otherTables = tables.filter((t) => t.public_number !== reservation.table)

  const handleMove = async () => {
    if (!targetTableId) return
    setBusy(true)
    setError(null)
    try {
      const isActive = reservation.status === "active"
      if (isActive) {
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
          throw new Error(body?.detail ?? "Failed to move table")
        }
      } else {
        const res = await apiFetch(`/api/reservations/reservations/${reservation.public_id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: targetTableId }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { detail?: string } | null
          throw new Error(body?.detail ?? "Failed to move table")
        }
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move table")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="modify-modal" role="dialog" aria-modal="true">
          <div className="modify-modal__header">
            <h2 className="modify-modal__title">Move Reservation</h2>
            <button
              type="button"
              className="modify-modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="modify-modal__body">
            <p className="modify-modal__detail">
              Guest: {reservation.name} &middot; Table {reservation.table} &middot;{" "}
              {reservation.guest_count} guests
            </p>

            {error && (
              <p className="modify-modal__error" role="alert">
                {error}
              </p>
            )}

            <label className="modify-modal__field">
              <span className="modify-modal__label">Target table</span>
              <select
                className="modify-modal__input"
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

          <div className="modify-modal__actions">
            <button type="button" className="modify-modal__btn" onClick={onClose} disabled={busy}>
              CANCEL
            </button>
            <button
              type="button"
              className="modify-modal__btn modify-modal__btn--primary"
              disabled={busy || !targetTableId}
              onClick={handleMove}
            >
              {busy ? "MOVING…" : "MOVE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
