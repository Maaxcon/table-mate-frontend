import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useToast } from "@/features/admin/hooks/toastContext"
import { batchUpdateReservations } from "./api"
import { useSchedulerState } from "./hooks/useSchedulerState"
import { useSchedulerData } from "./hooks/useSchedulerData"
import { useScrollSync } from "./hooks/useScrollSync"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
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
    if (fetchedReservations.length > 0) {
      setReservations(fetchedReservations)
    }
  }, [fetchedReservations, setReservations])

  const scrollRefA = useRef<HTMLDivElement>(null)
  const scrollRefB = useRef<HTMLDivElement>(null)
  useScrollSync(scrollRefA, scrollRefB)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const modifiedIds = useMemo(
    () => new Set(state.pendingChanges.map((c) => c.reservation_id)),
    [state.pendingChanges],
  )

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

  const handleResizeStart = useCallback(
    (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => {
      e.preventDefault()
      const reservation = state.reservations.find((r) => r.public_id === reservationId)
      if (!reservation) return

      const startX = e.clientX
      const startDt = new Date(edge === "start" ? reservation.start_at : reservation.end_at)
      const totalMinutes = (HOUR_END - HOUR_START) * 60

      const dayEl = (e.target as HTMLElement).closest(".scheduler__day-panel-body")
      if (!dayEl) return
      const rowEl = (e.target as HTMLElement).closest(".scheduler__table-row-cells")
      if (!rowEl) return
      const rowWidth = rowEl.getBoundingClientRect().width

      const onMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.clientX - startX
        const dMinute = Math.round(((dx / rowWidth) * totalMinutes) / SLOT_MINUTES) * SLOT_MINUTES

        const newDt = new Date(startDt)
        newDt.setMinutes(newDt.getMinutes() + dMinute)

        const hh = String(newDt.getHours()).padStart(2, "0")
        const mm = String(newDt.getMinutes()).padStart(2, "0")
        resizeReservation(reservationId, edge, `${hh}:${mm}`)
      }

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [state.reservations, resizeReservation],
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
            <div className="scheduler__drag-overlay" />
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
