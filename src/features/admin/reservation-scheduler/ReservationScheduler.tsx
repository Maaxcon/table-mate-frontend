import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragStartEvent } from "@dnd-kit/core"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useToast } from "@/features/admin/hooks/toastContext"
import { fetchRestaurantSettings } from "@/features/reservation/api"
import { batchUpdateReservations } from "./api"
import { useSchedulerState } from "./hooks/useSchedulerState"
import { useSchedulerData } from "./hooks/useSchedulerData"
import { useScrollSync } from "./hooks/useScrollSync"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import { checkOverlap } from "./hooks/useOverlapCheck"
import { isoToDateKey } from "./types"
import { DayPanel } from "./DayPanel"
import { SaveBar } from "./SaveBar"
import "./ReservationScheduler.css"

const HOUR_START = 8
const HOUR_END = 23
const SLOT_MINUTES = 15

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

export function ReservationScheduler() {
  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const { toast } = useToast()

  const {
    state,
    setDates,
    setReservations,
    moveReservation,
    resizeReservation,
    resetChanges,
    markConflict,
    clearConflict,
    setSaving,
    commitChanges,
  } = useSchedulerState()

  const [baseDate, setBaseDate] = useState(() => {
    const today = new Date()
    return formatDateKey(today)
  })
  const [showSecondDay, setShowSecondDay] = useState(false)
  const [restaurantTimezone, setRestaurantTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )

  useEffect(() => {
    if (!restaurantId) return
    fetchRestaurantSettings(restaurantId)
      .then((settings) => {
        if (settings?.timezone) setRestaurantTimezone(settings.timezone)
      })
      .catch(() => {})
  }, [restaurantId])

  const dates = useMemo(() => {
    if (showSecondDay) {
      const d2 = formatDateKey(addDays(new Date(baseDate + "T00:00:00"), 1))
      return [baseDate, d2]
    }
    return [baseDate]
  }, [baseDate, showSecondDay])

  useEffect(() => {
    setDates(dates)
  }, [dates, setDates])

  const {
    tables,
    reservations: fetchedReservations,
    loading,
    error,
    refetch,
  } = useSchedulerData(dates)

  useEffect(() => {
    setReservations(fetchedReservations)
  }, [fetchedReservations, setReservations])

  const scrollRefA = useRef<HTMLDivElement>(null)
  const scrollRefB = useRef<HTMLDivElement>(null)
  useScrollSync(scrollRefA, scrollRefB)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const modifiedIds = useMemo(
    () => new Set(state.pendingChanges.map((c) => c.reservation_id)),
    [state.pendingChanges],
  )

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])

  const { handleDragEnd } = useDragAndDrop({
    tables,
    reservations: state.reservations,
    pendingChanges: state.pendingChanges,
    hourStart: HOUR_START,
    hourEnd: HOUR_END,
    slotMinutes: SLOT_MINUTES,
    onMove: moveReservation,
    onConflict: markConflict,
  })

  const handleDragEndWithClear = useCallback(
    (args: Parameters<typeof handleDragEnd>[0]) => {
      handleDragEnd(args)
      setActiveDragId(null)
    },
    [handleDragEnd],
  )

  const reservationsRef = useRef(state.reservations)
  const pendingChangesRef = useRef(state.pendingChanges)
  useEffect(() => {
    reservationsRef.current = state.reservations
  }, [state.reservations])
  useEffect(() => {
    pendingChangesRef.current = state.pendingChanges
  }, [state.pendingChanges])

  const handleResizeStart = useCallback(
    (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => {
      e.preventDefault()
      const reservation = state.reservations.find((r) => r.public_id === reservationId)
      if (!reservation) return

      const startX = e.clientX
      const edgeTime = new Date(edge === "start" ? reservation.start_at : reservation.end_at)
      const startLocalHours = edgeTime.getHours()
      const startLocalMinutes = edgeTime.getMinutes()
      const totalMinutes = (HOUR_END - HOUR_START) * 60

      const dayEl = (e.target as HTMLElement).closest(".scheduler__day-panel-body")
      if (!dayEl) return
      const rowEl = (e.target as HTMLElement).closest(".scheduler__table-row-cells")
      if (!rowEl) return
      const rowWidth = rowEl.getBoundingClientRect().width

      const onMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.clientX - startX
        const dMinute = Math.round(((dx / rowWidth) * totalMinutes) / SLOT_MINUTES) * SLOT_MINUTES

        const totalMin = startLocalHours * 60 + startLocalMinutes + dMinute
        const clamped = Math.max(HOUR_START * 60, Math.min(totalMin, HOUR_END * 60 - SLOT_MINUTES))
        const hh = String(Math.floor(clamped / 60)).padStart(2, "0")
        const mm = String(clamped % 60).padStart(2, "0")

        const currentRes = reservationsRef.current
        const currentChanges = pendingChangesRef.current
        const res = currentRes.find((r) => r.public_id === reservationId)
        if (!res) return

        const curStart = new Date(res.start_at)
        const curEnd = new Date(res.end_at)
        const proposed = {
          table_id: res.table,
          date: isoToDateKey(res.start_at),
          start_minutes:
            edge === "start" ? clamped : curStart.getHours() * 60 + curStart.getMinutes(),
          end_minutes: edge === "end" ? clamped : curEnd.getHours() * 60 + curEnd.getMinutes(),
        }
        if (checkOverlap(proposed, currentRes, currentChanges, reservationId)) return

        resizeReservation(reservationId, edge, `${hh}:${mm}`)
      }

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)

        const currentRes = reservationsRef.current
        const currentChanges = pendingChangesRef.current
        const updated = currentRes.find((r) => r.public_id === reservationId)
        if (updated) {
          const start = new Date(updated.start_at)
          const end = new Date(updated.end_at)
          const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
          const proposed = {
            table_id: updated.table,
            date: dateStr,
            start_minutes: start.getHours() * 60 + start.getMinutes(),
            end_minutes: end.getHours() * 60 + end.getMinutes(),
          }
          if (checkOverlap(proposed, currentRes, currentChanges, reservationId)) {
            markConflict(reservationId)
          }
        }
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [state.reservations, resizeReservation, markConflict],
  )

  const handleSave = useCallback(async () => {
    if (!restaurantId || state.pendingChanges.length === 0) return

    setSaving(true)
    clearConflict()

    const payload = {
      changes: state.pendingChanges.map((c) => ({
        reservation_id: c.reservation_id,
        new_table_id: c.new_table_id,
        new_date: c.new_date,
        new_start_time: c.new_start_time,
        new_end_time: c.new_end_time,
      })),
    }

    const result = await batchUpdateReservations(payload)

    if (result.ok) {
      commitChanges()
      refetch()
      toast.success("Reservations updated successfully.")
    } else {
      if (result.conflicting_reservation_id) {
        markConflict(result.conflicting_reservation_id)
      }
      toast.error(result.message)
    }

    setSaving(false)
  }, [
    restaurantId,
    state.pendingChanges,
    setSaving,
    clearConflict,
    commitChanges,
    refetch,
    toast,
    markConflict,
  ])

  const handlePrevDay = () => {
    setBaseDate(formatDateKey(addDays(new Date(baseDate + "T00:00:00"), -1)))
  }

  const handleNextDay = () => {
    setBaseDate(formatDateKey(addDays(new Date(baseDate + "T00:00:00"), 1)))
  }

  const handleToday = () => {
    setBaseDate(formatDateKey(new Date()))
  }

  if (!restaurantId) {
    return <div className="scheduler__empty">No restaurant selected.</div>
  }

  return (
    <div className="scheduler">
      <div className="scheduler__toolbar">
        <div className="scheduler__toolbar-nav">
          <button type="button" className="scheduler__nav-btn" onClick={handlePrevDay}>
            <LuChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="scheduler__today-btn" onClick={handleToday}>
            Today
          </button>
          <button type="button" className="scheduler__nav-btn" onClick={handleNextDay}>
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="scheduler__toolbar-actions">
          <span className="scheduler__timezone-label">{restaurantTimezone}</span>
          <button
            type="button"
            className={`scheduler__split-btn${showSecondDay ? " scheduler__split-btn--active" : ""}`}
            onClick={() => setShowSecondDay((v) => !v)}
          >
            {showSecondDay ? "Single View" : "Split View"}
          </button>
        </div>
      </div>

      {loading && <div className="scheduler__loading">Loading...</div>}
      {error && <div className="scheduler__error">{error}</div>}

      {!loading && !error && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndWithClear}
        >
          <div className={`scheduler__grid scheduler__grid--${dates.length}`}>
            {dates.map((date, i) => (
              <DayPanel
                key={date}
                date={date}
                tables={tables}
                reservations={state.reservations}
                hourStart={HOUR_START}
                hourEnd={HOUR_END}
                conflictReservationId={state.conflictReservationId}
                modifiedIds={modifiedIds}
                onResizeStart={handleResizeStart}
                scrollRef={i === 0 ? scrollRefA : scrollRefB}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragId
              ? (() => {
                  const r = state.reservations.find((res) => res.public_id === activeDragId)
                  if (!r) return null
                  const start = new Date(r.start_at)
                  const hh = String(start.getHours()).padStart(2, "0")
                  const mm = String(start.getMinutes()).padStart(2, "0")
                  return (
                    <div className="scheduler__drag-overlay">
                      <span className="scheduler__drag-overlay-name">{r.customer_name}</span>
                      <span className="scheduler__drag-overlay-meta">
                        {r.guest_count}p &middot; {hh}:{mm}
                      </span>
                    </div>
                  )
                })()
              : null}
          </DragOverlay>
        </DndContext>
      )}

      <SaveBar
        changeCount={state.pendingChanges.length}
        saving={state.saving}
        onSave={handleSave}
        onReset={resetChanges}
      />
    </div>
  )
}
