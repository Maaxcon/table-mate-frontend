import { useState } from "react"
import { apiFetch } from "@/api/client"
import "./CreateReservationModal.css"

interface TableOption {
  public_id: string
  public_number: string
}

interface CreateReservationModalProps {
  tables: TableOption[]
  onClose: () => void
  onSuccess: () => void
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateReservationModal({
  tables,
  onClose,
  onSuccess,
}: CreateReservationModalProps) {
  const now = new Date()
  const defaultEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const [tableId, setTableId] = useState(tables[0]?.public_id ?? "")
  const [guestName, setGuestName] = useState("")
  const [guestCount, setGuestCount] = useState(2)
  const [startAt, setStartAt] = useState(toDatetimeLocal(now.toISOString()))
  const [endAt, setEndAt] = useState(toDatetimeLocal(defaultEnd.toISOString()))
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const startDate = new Date(startAt)
    const endDate = new Date(endAt)
    if (endDate <= startDate) {
      setError("End time must be after the start time.")
      return
    }
    if (!tableId) {
      setError("Please select a table.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/reservations/reservations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: tableId,
          guest_name: guestName || undefined,
          guest_count: guestCount,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail ?? "Failed to create reservation")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="create-res"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onClose()
      }}
    >
      <div className="create-res__dialog" role="dialog" aria-modal="true">
        <div className="create-res__header">
          <h2 className="create-res__title">New Reservation</h2>
          <button
            type="button"
            className="create-res__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="create-res__body">
          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-table">
              Table
            </label>
            <select
              id="cr-table"
              className="create-res__input"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              disabled={busy}
            >
              {tables.map((t) => (
                <option key={t.public_id} value={t.public_id}>
                  {t.public_number}
                </option>
              ))}
            </select>
          </div>

          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-name">
              Name
            </label>
            <input
              id="cr-name"
              type="text"
              className="create-res__input"
              placeholder="Guest name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-guests">
              Guests
            </label>
            <input
              id="cr-guests"
              type="number"
              className="create-res__input"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
              disabled={busy}
            />
          </div>

          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-start">
              Start
            </label>
            <input
              id="cr-start"
              type="datetime-local"
              className="create-res__input"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-end">
              End
            </label>
            <input
              id="cr-end"
              type="datetime-local"
              className="create-res__input"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="create-res__field">
            <label className="create-res__label" htmlFor="cr-notes">
              Notes
            </label>
            <input
              id="cr-notes"
              type="text"
              className="create-res__input"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <p className="create-res__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="create-res__actions">
          <button type="button" className="create-res__btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="create-res__btn create-res__btn--primary"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}
