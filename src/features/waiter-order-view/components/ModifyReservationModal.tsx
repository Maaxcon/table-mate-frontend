import { useState } from "react"
import { apiFetch } from "@/api/client"
import type { ReservationItem } from "../data/waiterTypes"
import { formatTimeRange } from "../data/waiterTypes"
import "./ModifyReservationModal.css"

interface ModifyReservationModalProps {
  reservation: ReservationItem
  onClose: () => void
  onSuccess: () => void
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ModifyReservationModal({
  reservation,
  onClose,
  onSuccess,
}: ModifyReservationModalProps) {
  const [endAt, setEndAt] = useState(toDatetimeLocal(reservation.end_at))
  const [guestCount, setGuestCount] = useState(reservation.guest_count)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const endDate = new Date(endAt)
    const startDate = new Date(reservation.start_at)
    if (endDate <= startDate) {
      setError("End time must be after the start time.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/reservations/reservations/${reservation.public_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          end_at: endDate.toISOString(),
          guest_count: guestCount,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail ?? "Failed to update reservation")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reservation")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modify-res"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onClose()
      }}
    >
      <div className="modify-res__dialog" role="dialog" aria-modal="true">
        <div className="modify-res__header">
          <h2 className="modify-res__title">Modify Reservation</h2>
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
            <span className="modify-res__value">{reservation.name}</span>
          </div>

          <div className="modify-res__field">
            <span className="modify-res__label">Table</span>
            <span className="modify-res__value">{reservation.table}</span>
          </div>

          <div className="modify-res__field">
            <span className="modify-res__label">Start</span>
            <span className="modify-res__value">
              {formatTimeRange(reservation.start_at, reservation.end_at).split(" - ")[0]}
            </span>
          </div>

          <div className="modify-res__field">
            <label className="modify-res__label" htmlFor="mod-res-end">
              End
            </label>
            <input
              id="mod-res-end"
              type="datetime-local"
              className="modify-res__input"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="modify-res__field">
            <label className="modify-res__label" htmlFor="mod-res-guests">
              Guests
            </label>
            <input
              id="mod-res-guests"
              type="number"
              className="modify-res__input"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
              disabled={busy}
            />
          </div>

          {error && (
            <p className="modify-res__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modify-res__actions">
          <button type="button" className="modify-res__btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="modify-res__btn modify-res__btn--primary"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
