import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragStartEvent } from "@dnd-kit/core"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useToast } from "@/features/admin/hooks/toastContext"
import type { WorkingHoursDay } from "@/features/reservation/api"
import { fetchRestaurantSettings } from "@/features/reservation/api"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import { useUnsavedChanges } from "@/features/admin/hooks/unsavedChanges"
import { useHallSubscription } from "@/features/waiter-order-view/hooks/useHallSubscription"
import { batchUpdateReservations } from "./api"
import { useSchedulerState } from "./hooks/useSchedulerState"
import { useSchedulerData } from "./hooks/useSchedulerData"
import { useScrollSync } from "./hooks/useScrollSync"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import {
  checkOperatingHours,
  checkOverlap,
  checkOrderingViolation,
  checkPastTimeViolation,
} from "./hooks/useOverlapCheck"
import { isoToDateKey } from "./types"
import { DayPanel } from "./DayPanel"
import { SaveBar } from "./SaveBar"
import "./ReservationScheduler.css"

const SLOT_MINUTES = 15

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function computeHourRange(workingHours: Record<string, WorkingHoursDay> | null): {
  hourStart: number
  hourEnd: number
} {
  if (!workingHours) return { hourStart: 8, hourEnd: 23 }
  let minOpen = Infinity
  let maxClose = -Infinity
  for (const dayHours of Object.values(workingHours)) {
    if (!dayHours) continue
    const openMin = toMinutes(dayHours.open)
    const closeMin = toMinutes(dayHours.close)
    if (closeMin <= openMin) continue
    minOpen = Math.min(minOpen, openMin)
    maxClose = Math.max(maxClose, closeMin)
  }
  return {
    hourStart: minOpen === Infinity ? 8 : Math.floor(minOpen / 60),
    hourEnd: maxClose === -Infinity ? 23 : Math.ceil(maxClose / 60),
  }
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function localToISOString(dateStr: string, timeHHMM: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [h, min] = timeHHMM.split(":").map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString()
}

export function ReservationScheduler() {
  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const toast = useToast()
  const { setDirty } = useUnsavedChanges()

  const {
    state,
    setDates,
    setReservations,
    moveReservation,
    resizeReservation,
    resetChanges,
    clearPending,
    markConflict,
    clearConflict,
    setSaving,
    commitChanges,
  } = useSchedulerState()

  const [dates, setDatesState] = useState<string[]>(() => [formatDateKey(new Date())])
  const [restaurantTimezone, setRestaurantTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)

  const { hourStart, hourEnd } = useMemo(() => computeHourRange(workingHours), [workingHours])

  useEffect(() => {
    if (!restaurantId) return
    fetchRestaurantSettings(restaurantId)
      .then((settings) => {
        if (settings?.timezone) setRestaurantTimezone(settings.timezone)
        if (settings?.working_hours) setWorkingHours(settings.working_hours)
      })
      .catch(() => {})
  }, [restaurantId])

  useEffect(() => {
    setDates(dates)
  }, [dates, setDates])

  useEffect(() => {
    setDirty(state.pendingChanges.length > 0)
  }, [state.pendingChanges, setDirty])

  useEffect(() => {
    if (state.pendingChanges.length === 0) return
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBefore)
    return () => window.removeEventListener("beforeunload", onBefore)
  }, [state.pendingChanges])

  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null)

  const guardedNav = useCallback(
    (action: () => void) => {
      if (state.pendingChanges.length > 0) {
        setPendingNavAction(() => action)
      } else {
        action()
      }
    },
    [state.pendingChanges],
  )

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

  useHallSubscription({
    onReservationsUpdated: refetch,
  })

  const confirmNav = useCallback(() => {
    const action = pendingNavAction
    setPendingNavAction(null)
    clearPending()
    action?.()
  }, [pendingNavAction, clearPending])

  const cancelNav = useCallback(() => {
    setPendingNavAction(null)
  }, [])

  const toggleSplitView = useCallback(() => {
    guardedNav(() => {
      setDatesState((prev) => {
        if (prev.length === 2) return [prev[0]]
        const secondDate = formatDateKey(addDays(new Date(prev[0] + "T00:00:00"), 1))
        return [prev[0], secondDate]
      })
    })
  }, [guardedNav])

  const shiftDate = useCallback(
    (index: number, delta: number) => {
      guardedNav(() => {
        setDatesState((prev) => {
          const next = [...prev]
          next[index] = formatDateKey(addDays(new Date(next[index] + "T00:00:00"), delta))
          return next
        })
      })
    },
    [guardedNav],
  )

  const shiftAllDates = useCallback(
    (delta: number) => {
      guardedNav(() => {
        setDatesState((prev) =>
          prev.map((d) => formatDateKey(addDays(new Date(d + "T00:00:00"), delta))),
        )
      })
    },
    [guardedNav],
  )

  const setTodayAll = useCallback(() => {
    guardedNav(() => {
      const today = formatDateKey(new Date())
      setDatesState((prev) =>
        prev.length === 2 ? [today, formatDateKey(addDays(new Date(), 1))] : [today],
      )
    })
  }, [guardedNav])

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
    hourStart,
    hourEnd,
    slotMinutes: SLOT_MINUTES,
    restaurantTimezone,
    workingHours,
    onMove: moveReservation,
    onConflict: (id: string, reason?: string) => {
      markConflict(id)
      toast.error(reason ?? "Cannot place reservation here")
    },
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

      if (reservation.status === "completed") return
      if (reservation.status === "active" && edge === "start") return

      const startX = e.clientX
      const edgeTime = new Date(edge === "start" ? reservation.start_at : reservation.end_at)
      const startLocalHours = edgeTime.getHours()
      const startLocalMinutes = edgeTime.getMinutes()
      const totalMinutes = (hourEnd - hourStart) * 60

      const dayEl = (e.target as HTMLElement).closest(".scheduler__day-panel-body")
      if (!dayEl) return
      const rowEl = (e.target as HTMLElement).closest(".scheduler__table-row-cells")
      if (!rowEl) return
      const rowWidth = rowEl.getBoundingClientRect().width

      const onMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.clientX - startX
        const dMinute = Math.round(((dx / rowWidth) * totalMinutes) / SLOT_MINUTES) * SLOT_MINUTES

        const totalMin = startLocalHours * 60 + startLocalMinutes + dMinute
        const clamped = Math.max(hourStart * 60, Math.min(totalMin, hourEnd * 60 - SLOT_MINUTES))

        const currentRes = reservationsRef.current
        const currentChanges = pendingChangesRef.current
        const res = currentRes.find((r) => r.public_id === reservationId)
        if (!res) return

        const curStart = new Date(res.start_at)
        const curEnd = new Date(res.end_at)

        let effectiveClamped = clamped
        if (res.status === "active" && edge === "end") {
          const now = new Date()
          const nowMinutes = now.getHours() * 60 + now.getMinutes()
          effectiveClamped = Math.max(clamped, nowMinutes + 15)
        }

        const ehh = String(Math.floor(effectiveClamped / 60)).padStart(2, "0")
        const emm = String(effectiveClamped % 60).padStart(2, "0")

        const proposed = {
          table_id: res.table,
          date: isoToDateKey(res.start_at),
          start_minutes:
            edge === "start" ? effectiveClamped : curStart.getHours() * 60 + curStart.getMinutes(),
          end_minutes:
            edge === "end" ? effectiveClamped : curEnd.getHours() * 60 + curEnd.getMinutes(),
        }
        if (checkOverlap(proposed, currentRes, currentChanges, reservationId)) return

        const orderingReason = checkOrderingViolation(proposed, currentRes, reservationId)
        if (orderingReason) return

        const pastReason = checkPastTimeViolation(proposed, res.status, restaurantTimezone)
        if (pastReason) return

        const hoursReason = checkOperatingHours(proposed, workingHours)
        if (hoursReason) return

        resizeReservation(reservationId, edge, `${ehh}:${emm}`)
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
            toast.error("Time slot overlaps with another reservation")
            return
          }
          const orderingReason = checkOrderingViolation(proposed, currentRes, reservationId)
          if (orderingReason) {
            markConflict(reservationId)
            toast.error(orderingReason)
            return
          }
          const pastReason = checkPastTimeViolation(proposed, updated.status, restaurantTimezone)
          if (pastReason) {
            markConflict(reservationId)
            toast.error(pastReason)
            return
          }
          const hoursReason = checkOperatingHours(proposed, workingHours)
          if (hoursReason) {
            markConflict(reservationId)
            toast.error(hoursReason)
          }
        }
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [
      state.reservations,
      resizeReservation,
      markConflict,
      toast,
      hourStart,
      hourEnd,
      restaurantTimezone,
      workingHours,
    ],
  )

  const handleSave = useCallback(async () => {
    if (!restaurantId || state.pendingChanges.length === 0) return

    setSaving(true)
    clearConflict()

    try {
      const payload = {
        changes: state.pendingChanges.map((c) => {
          const utcStart = localToISOString(c.new_date, c.new_start_time)
          const utcEnd = localToISOString(c.new_date, c.new_end_time)
          return {
            reservation_id: c.reservation_id,
            new_table_id: c.new_table_id,
            new_date: utcStart.slice(0, 10),
            new_start_time: utcStart.slice(11, 16),
            new_end_time: utcEnd.slice(11, 16),
          }
        }),
      }

      const result = await batchUpdateReservations(payload)

      if (result.ok) {
        commitChanges()
        refetch()
        toast.success("Reservations updated successfully.")
      } else {
        if (result.conflicting_reservation_id) {
          markConflict(result.conflicting_reservation_id)
          toast.error(result.message)
        } else {
          resetChanges()
          toast.error(result.message)
        }
      }
    } catch {
      resetChanges()
      toast.error("Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }, [
    restaurantId,
    state.pendingChanges,
    setSaving,
    clearConflict,
    commitChanges,
    refetch,
    toast,
    markConflict,
    resetChanges,
  ])

  if (!restaurantId) {
    return <div className="scheduler__empty">No restaurant selected.</div>
  }

  return (
    <div className="scheduler">
      <div className="scheduler__toolbar">
        <div className="scheduler__toolbar-nav">
          <button type="button" className="scheduler__nav-btn" onClick={() => shiftAllDates(-1)}>
            <LuChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="scheduler__today-btn" onClick={setTodayAll}>
            Today
          </button>
          <button type="button" className="scheduler__nav-btn" onClick={() => shiftAllDates(1)}>
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="scheduler__toolbar-actions">
          <span className="scheduler__timezone-label">{restaurantTimezone}</span>
          <button
            type="button"
            className={`scheduler__split-btn${dates.length === 2 ? " scheduler__split-btn--active" : ""}`}
            onClick={toggleSplitView}
          >
            {dates.length === 2 ? "Single View" : "Split View"}
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
                hourStart={hourStart}
                hourEnd={hourEnd}
                conflictReservationId={state.conflictReservationId}
                modifiedIds={modifiedIds}
                onResizeStart={handleResizeStart}
                scrollRef={i === 0 ? scrollRefA : scrollRefB}
                showNav={dates.length === 2}
                onPrevDay={() => shiftDate(i, -1)}
                onNextDay={() => shiftDate(i, 1)}
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

      {pendingNavAction && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="You have unsaved changes. Navigate without saving?"
          confirmLabel="Discard"
          tone="danger"
          onConfirm={confirmNav}
          onClose={cancelNav}
        />
      )}
    </div>
  )
}
