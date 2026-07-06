import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/api/client"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { normalizeSlots } from "@/features/reservation/utils"
import type { ReservationItem } from "../../types"
import "./ModifyReservationModal.css"

interface ModifyReservationModalProps {
  reservation: ReservationItem
  tables: { public_id: string; public_number: string }[]
  onClose: () => void
  onSuccess: () => void
}

function msToTime(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function ModifyReservationModal({
  reservation,
  tables,
  onClose,
  onSuccess,
}: ModifyReservationModalProps) {
  const parsedDate = useMemo(() => new Date(reservation.start_at), [reservation.start_at])
  const dateStr = localDateKey(parsedDate)

  const currentStartTime = msToTime(new Date(reservation.start_at).getTime())
  const currentEndTime = msToTime(new Date(reservation.end_at).getTime())
  const currentDurationMinutes = timeToMinutes(currentEndTime) - timeToMinutes(currentStartTime)

  const isActive = reservation.status === "active"

  const [selectedTime, setSelectedTime] = useState<string | null>(currentStartTime)
  const [durationMinutes, setDurationMinutes] = useState(Math.max(30, currentDurationMinutes))
  const [guestCount, setGuestCount] = useState(reservation.guest_count)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useFocusTrap<HTMLDivElement>({
    onEscape: () => {
      if (!busy) onClose()
    },
  })

  const [availableSlots, setAvailableSlots] = useState<string[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(true)

  const tableId = tables.find((t) => t.public_number === reservation.table)?.public_id

  useEffect(() => {
    if (!tableId) return
    const params = new URLSearchParams({ table: tableId, date: dateStr })
    params.append("exclude", reservation.public_id)
    let cancelled = false
    apiFetch(`/api/reservations/reservations/available-slots/?${params}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setAvailableSlots(null)
          return
        }
        const data = (await res.json()) as Record<string, string[]>
        const raw = data[dateStr]
        if (!cancelled) setAvailableSlots(raw ? normalizeSlots(raw) : null)
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots(null)
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tableId, dateStr, reservation.public_id])

  const endAt = useMemo(() => {
    if (!selectedTime) return ""
    return minutesToTime(timeToMinutes(selectedTime) + durationMinutes)
  }, [selectedTime, durationMinutes])

  const durationError = useMemo(() => {
    if (!selectedTime || !durationMinutes) return null
    if (availableSlots) {
      const startMins = timeToMinutes(selectedTime)
      const endMins = startMins + durationMinutes
      const slotStart = Math.floor(startMins / 30) * 30
      const slotEnd = Math.ceil(endMins / 30) * 30
      for (let m = slotStart; m < slotEnd; m += 30) {
        const slotTime = minutesToTime(m)
        if (!availableSlots.includes(slotTime)) {
          return "The selected duration is not fully available. Choose a shorter duration or different start time."
        }
      }
    }
    return null
  }, [selectedTime, durationMinutes, availableSlots])

  const handleSave = async () => {
    if (!selectedTime) return
    setError(null)
    setBusy(true)
    try {
      const startDt = isActive
        ? new Date(reservation.start_at)
        : new Date(`${dateStr}T${selectedTime}:00`)
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000)
      const body: Record<string, unknown> = {}
      if (isActive) {
        body.end_at = endDt.toISOString()
      } else {
        body.start_at = startDt.toISOString()
        body.end_at = endDt.toISOString()
        body.guest_count = guestCount
      }
      const res = await apiFetch(`/api/reservations/reservations/${reservation.public_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail ?? "Failed to modify reservation")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to modify reservation")
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
        aria-labelledby="modify-res-title"
      >
        <div className="modify-res__header">
          <h2 id="modify-res-title" className="modify-res__title">
            Modify Reservation
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
            <span className="modify-res__value">{reservation.name}</span>
          </div>
          <div className="modify-res__field">
            <span className="modify-res__label">Table</span>
            <span className="modify-res__value">{reservation.table}</span>
          </div>

          <div className="modify-res__section">
            <h3 className="modify-res__section-title">Date</h3>
            <p className="modify-res__section-value">
              {parsedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="modify-res__section">
            <h3 className="modify-res__section-title">Time</h3>
            {isActive ? (
              <p className="modify-res__section-value">Starting from {currentStartTime}</p>
            ) : slotsLoading ? (
              <p className="modify-res__section-value">Loading available slots…</p>
            ) : !tableId ? (
              <p className="modify-res__section-value">Table not found</p>
            ) : availableSlots && availableSlots.length === 0 ? (
              <p className="modify-res__section-value">No available slots</p>
            ) : !availableSlots ? (
              <p className="modify-res__section-value">
                Current: {currentStartTime} <em>(unable to load availability)</em>
              </p>
            ) : (
              <div className="modify-res__times">
                {availableSlots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={[
                      "modify-res__time-btn",
                      selectedTime === t ? "modify-res__time-btn--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {!slotsLoading && !availableSlots && !isActive && (
              <p className="modify-res__section-value">
                Current: {currentStartTime} <em>(unable to load availability)</em>
              </p>
            )}
          </div>

          <div className="modify-res__field">
            <label className="modify-res__label" htmlFor="mod-res-duration">
              Duration
            </label>
            <input
              id="mod-res-duration"
              type="number"
              className="modify-res__input"
              min={30}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(30, Number(e.target.value) || 30))}
              disabled={busy}
            />
            <span className="modify-res__unit">min</span>
            {durationError && <p className="modify-res__hint">{durationError}</p>}
          </div>

          {!isActive && (
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
          )}

          {selectedTime && (
            <div className="modify-res__field">
              <span className="modify-res__label">Summary</span>
              <span className="modify-res__value">
                {selectedTime} &ndash; {endAt} ({durationMinutes} min)
              </span>
            </div>
          )}

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
            disabled={!selectedTime || busy || !!durationError}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
