import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragMoveEvent, DragStartEvent } from "@dnd-kit/core"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useToast } from "@/features/admin/hooks/toastContext"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import type { WorkingHoursDay } from "@/features/reservation/api"
import { fetchRestaurantSettings } from "@/features/reservation/api"
import { useUnsavedChanges } from "@/features/admin/hooks/unsavedChanges"
import { env } from "@/config/env"
import { batchUpdateReservations } from "./api"
import { useSchedulerState } from "./hooks/useSchedulerState"
import { useSchedulerData } from "./hooks/useSchedulerData"
import { useScrollSync } from "./hooks/useScrollSync"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import {
  checkOverlap,
  checkOrderingViolation,
  checkPastTimeViolation,
} from "./hooks/useOverlapCheck"
import { isoToDateKey } from "./types"
import { CancelZone } from "./CancelZone"
import { DayPanel } from "./DayPanel"
import { SaveBar } from "./SaveBar"
import "./ReservationScheduler.css"

const SLOT_MINUTES = 15

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function computeDayHourRange(
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): { hourStart: number; hourEnd: number } {
  if (!workingHours) return { hourStart: 8, hourEnd: 23 }
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return { hourStart: 8, hourEnd: 23 }

  const openMin = toMinutes(dayHours.open)
  const closeMin = toMinutes(dayHours.close)
  if (openMin == null || closeMin == null) return { hourStart: 8, hourEnd: 23 }

  const hourStart = Math.floor(openMin / 60)
  const hourEnd =
    closeMin > openMin ? Math.ceil(closeMin / 60) : Math.ceil((closeMin + 24 * 60) / 60)

  return { hourStart, hourEnd }
}

function getDayWorkingBounds(
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): { start: number; end: number } {
  if (!workingHours) return { start: 8, end: 23 }
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return { start: 8, end: 23 }

  const openMin = toMinutes(dayHours.open)
  const closeMin = toMinutes(dayHours.close)
  if (openMin == null || closeMin == null) return { start: 8, end: 23 }

  return {
    start: Math.floor(openMin / 60),
    end: Math.ceil((closeMin > openMin ? closeMin : closeMin + 24 * 60) / 60),
  }
}

function getDayExtendedBounds(
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): { minHour: number; maxHour: number } | null {
  if (!workingHours) return null
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return null

  const openMin = toMinutes(dayHours.open)
  const closeMin = toMinutes(dayHours.close)
  if (openMin == null || closeMin == null) return null

  const prevDayKey = DAY_KEYS[(d.getDay() + 6) % 7]
  const nextDayKey = DAY_KEYS[(d.getDay() + 1) % 7]
  const prevHours = workingHours[prevDayKey]
  const nextHours = workingHours[nextDayKey]

  const prevClose = prevHours ? toMinutes(prevHours.close) : null
  const prevOpen = prevHours ? toMinutes(prevHours.open) : null
  const nextOpen = nextHours ? toMinutes(nextHours.open) : null

  const thisOpen = openMin

  let minHour = 0
  if (prevClose != null && prevOpen != null) {
    if (prevClose < prevOpen) {
      minHour = 0
    } else {
      const prevCloseAdjusted = prevClose <= thisOpen ? prevClose : prevClose - 24 * 60
      minHour = Math.floor(prevCloseAdjusted / 60)
    }
  }

  let maxHour = 24
  if (nextOpen != null) {
    const nextOpenAdjusted = nextOpen + 24 * 60
    maxHour = Math.ceil(nextOpenAdjusted / 60)
  }

  return { minHour, maxHour }
}

function isCrossDayReservation(
  resStartAt: string,
  resEndAt: string,
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): "prev" | "next" | null {
  const resDate = isoToDateKey(resStartAt)
  if (resDate === date) return null
  const diff = Math.round(
    (new Date(resDate + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime()) / 86400000,
  )
  if (Math.abs(diff) !== 1) return null
  if (diff === 1) {
    const bounds = getDayExtendedBounds(date, workingHours)
    if (!bounds) return null
    const resD = new Date(resStartAt)
    const resMinutes = 24 * 60 + resD.getHours() * 60 + resD.getMinutes()
    return resMinutes <= bounds.maxHour * 60 ? "next" : null
  }
  if (isoToDateKey(resEndAt) !== date) return null
  return "prev"
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
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const toast = useToast()
  const { setDirty } = useUnsavedChanges()

  const {
    state,
    setDates,
    setReservations,
    moveReservation,
    resizeReservation,
    cancelReservation,
    uncancelReservation,
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

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragDate, setActiveDragDate] = useState<string | null>(null)
  const [dragCrossedBoundary, setDragCrossedBoundary] = useState(false)
  const [pendingCancelConfirmId, setPendingCancelConfirmId] = useState<string | null>(null)
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null)
  const mountedRef = useRef(true)

  const { dayRanges, crossDayInfoByDate } = useMemo(() => {
    const ranges: Record<string, { hourStart: number; hourEnd: number }> = {}
    const crossInfo: Record<string, Record<string, "prev" | "next">> = {}

    for (const date of dates) {
      crossInfo[date] = {}
      const dayRange = computeDayHourRange(date, workingHours)
      const extendedBounds = getDayExtendedBounds(date, workingHours)
      let start = dayRange.hourStart
      let end = dayRange.hourEnd

      for (const r of state.reservations) {
        const rDate = isoToDateKey(r.start_at)
        if (rDate === date) {
          const s = new Date(r.start_at)
          const e = new Date(r.end_at)
          const startH = s.getHours() + s.getMinutes() / 60
          let endH = e.getHours() + e.getMinutes() / 60
          if (endH < startH) endH += 24
          if (startH < start) start = Math.floor(startH)
          if (endH > end) end = Math.ceil(endH)
        } else {
          const crossDir = isCrossDayReservation(r.start_at, r.end_at, date, workingHours)
          if (crossDir) {
            crossInfo[date][r.public_id] = crossDir
            if (crossDir === "next") {
              const s = new Date(r.start_at)
              const e = new Date(r.end_at)
              const startH = 24 + s.getHours() + s.getMinutes() / 60
              let endH = 24 + e.getHours() + e.getMinutes() / 60
              if (endH < startH) endH += 24
              if (startH < start) start = Math.floor(startH)
              if (endH > end) end = Math.ceil(endH)
            } else {
              start = Math.min(start, extendedBounds ? extendedBounds.minHour : 0)
              const e = new Date(r.end_at)
              const endH = e.getHours() + e.getMinutes() / 60
              if (endH > end) end = Math.ceil(endH)
            }
          }
        }
      }

      for (const change of state.pendingChanges) {
        if (change.new_date !== date) continue
        const [sh, sm] = change.new_start_time.split(":").map(Number)
        const [eh, em] = change.new_end_time.split(":").map(Number)
        const startH = sh + sm / 60
        let endH = eh + em / 60
        if (endH < startH) endH += 24
        if (startH < start) start = Math.floor(startH)
        if (endH > end) end = Math.ceil(endH)
      }

      if (activeDragId && activeDragDate === date && dragCrossedBoundary) {
        if (extendedBounds) {
          ranges[date] = { hourStart: extendedBounds.minHour, hourEnd: extendedBounds.maxHour }
        } else {
          ranges[date] = { hourStart: Math.max(0, start - 1), hourEnd: end + 1 }
        }
        continue
      }

      if (extendedBounds) {
        start = Math.max(start, extendedBounds.minHour)
        end = Math.min(end, extendedBounds.maxHour)
      }

      ranges[date] = {
        hourStart: Math.max(extendedBounds ? extendedBounds.minHour : 0, start),
        hourEnd: end,
      }
    }

    return { dayRanges: ranges, crossDayInfoByDate: crossInfo }
  }, [
    dates,
    workingHours,
    state.reservations,
    state.pendingChanges,
    activeDragId,
    activeDragDate,
    dragCrossedBoundary,
  ])

  const reservationsRef = useRef(state.reservations)
  const pendingChangesRef = useRef(state.pendingChanges)
  useEffect(() => {
    reservationsRef.current = state.reservations
  }, [state.reservations])
  useEffect(() => {
    pendingChangesRef.current = state.pendingChanges
  }, [state.pendingChanges])

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

  const [externalUpdate, setExternalUpdate] = useState(false)

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

  const handleExternalUpdate = useCallback(() => {
    if (pendingChangesRef.current.length > 0) {
      setExternalUpdate(true)
    } else {
      refetch()
    }
  }, [refetch])

  useEffect(() => {
    if (!accessToken || env.wsUrl === "Not configured") return

    mountedRef.current = true
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      ws = new WebSocket(`${env.wsUrl}/staff/reservations/?token=${accessToken}`)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { event_name?: string }
          if (
            data.event_name === "HALL_RESERVATIONS_UPDATED" ||
            data.event_name === "HALL_NEW_RESERVATION" ||
            data.event_name === "HALL_RESERVATION_CANCELLED" ||
            data.event_name === "HALL_SESSION_AUTO_EXTENDED"
          ) {
            handleExternalUpdate()
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = (e) => {
        ws = null
        if (!mountedRef.current) return
        if (e.code === 4001 || e.code === 4003) return
        if (e.code !== 1000) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer)
      if (ws) {
        ws.close(1000)
        ws = null
      }
    }
  }, [accessToken, handleExternalUpdate])

  const handleCommitChanges = useCallback(() => {
    commitChanges()
    pendingChangesRef.current = []
    setExternalUpdate(false)
  }, [commitChanges])

  const handleResetChanges = useCallback(() => {
    resetChanges()
    pendingChangesRef.current = []
    setExternalUpdate(false)
    refetch()
  }, [resetChanges, refetch])

  const discardExternalUpdate = useCallback(() => {
    clearPending()
    setExternalUpdate(false)
    refetch()
  }, [clearPending, refetch])

  const dismissExternalUpdate = useCallback(() => {
    setExternalUpdate(false)
  }, [])

  const guardedDateNav = useCallback(
    (action: () => void) => {
      if (state.pendingChanges.length > 0 || state.pendingCancellationIds.length > 0) {
        setPendingNavAction(() => action)
      } else {
        action()
      }
    },
    [state.pendingChanges.length, state.pendingCancellationIds.length],
  )

  const toggleSplitView = useCallback(() => {
    guardedDateNav(() => {
      setDatesState((prev) => {
        if (prev.length === 2) return [prev[0]]
        const secondDate = formatDateKey(addDays(new Date(prev[0] + "T00:00:00"), 1))
        return [prev[0], secondDate]
      })
    })
  }, [guardedDateNav])

  const shiftDate = useCallback(
    (index: number, delta: number) => {
      guardedDateNav(() => {
        setDatesState((prev) => {
          const next = [...prev]
          next[index] = formatDateKey(addDays(new Date(next[index] + "T00:00:00"), delta))
          return next
        })
      })
    },
    [guardedDateNav],
  )

  const shiftAllDates = useCallback(
    (delta: number) => {
      guardedDateNav(() => {
        setDatesState((prev) =>
          prev.map((d) => formatDateKey(addDays(new Date(d + "T00:00:00"), delta))),
        )
      })
    },
    [guardedDateNav],
  )

  const setTodayAll = useCallback(() => {
    guardedDateNav(() => {
      const today = formatDateKey(new Date())
      setDatesState((prev) =>
        prev.length === 2 ? [today, formatDateKey(addDays(new Date(), 1))] : [today],
      )
    })
  }, [guardedDateNav])

  const scrollRefA = useRef<HTMLDivElement>(null)
  const scrollRefB = useRef<HTMLDivElement>(null)
  useScrollSync(scrollRefA, scrollRefB)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  )

  const modifiedIds = useMemo(
    () => new Set(state.pendingChanges.map((c) => c.reservation_id)),
    [state.pendingChanges],
  )
  const cancellingIds = useMemo(
    () => new Set(state.pendingCancellationIds),
    [state.pendingCancellationIds],
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const dragId = String(event.active.id)
      setActiveDragId(dragId)
      setDragCrossedBoundary(false)
      const reservation = state.reservations.find((r) => r.public_id === dragId)
      if (reservation) {
        setActiveDragDate(isoToDateKey(reservation.start_at))
      }
    },
    [state.reservations],
  )

  const handleCancel = useCallback(
    (reservationId: string) => {
      const res = state.reservations.find((r) => r.public_id === reservationId)
      if (res?.status === "active") {
        setPendingCancelConfirmId(reservationId)
      } else {
        cancelReservation(reservationId)
      }
    },
    [state.reservations, cancelReservation],
  )

  const handleUncancel = useCallback(
    (reservationId: string) => {
      uncancelReservation(reservationId)
    },
    [uncancelReservation],
  )

  const { handleDragEnd } = useDragAndDrop({
    tables,
    reservations: state.reservations,
    pendingChanges: state.pendingChanges,
    pendingCancellationIds: state.pendingCancellationIds,
    dayRanges,
    slotMinutes: SLOT_MINUTES,
    restaurantTimezone,
    onMove: (
      reservationId,
      newTableId,
      newTableNumber,
      newDate,
      newStartTime,
      newEndTime,
      crossMidnight,
    ) =>
      moveReservation(
        reservationId,
        newTableId,
        newTableNumber,
        newDate,
        newStartTime,
        newEndTime,
        crossMidnight,
      ),
    onConflict: (id: string, reason?: string) => {
      markConflict(id)
      toast.error(reason ?? "Cannot place reservation here")
    },
    onCancel: handleCancel,
    onUncancel: handleUncancel,
  })

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!activeDragDate || dragCrossedBoundary) return
      const activeData = event.active.data.current as
        | { reservationId: string; durationMinutes: number }
        | undefined
      if (!activeData) return
      const over = event.over
      if (!over) return

      const dayRange = computeDayHourRange(activeDragDate, workingHours)
      const { hourStart, hourEnd } = dayRange
      const { durationMinutes } = activeData
      const rect = over.rect
      if (!rect) return
      const blockLeft = event.active.rect.current?.translated?.left
      if (blockLeft == null) return
      const pointerX = blockLeft - rect.left
      const totalMinutes = (hourEnd - hourStart) * 60
      const minuteOffset =
        Math.round(((pointerX / rect.width) * totalMinutes) / SLOT_MINUTES) * SLOT_MINUTES
      const rawMinute = hourStart * 60 + minuteOffset

      if (rawMinute < hourStart * 60 || rawMinute + durationMinutes > hourEnd * 60) {
        setDragCrossedBoundary(true)
      }
    },
    [activeDragDate, dragCrossedBoundary, workingHours],
  )

  const handleDragEndWithClear = useCallback(
    (args: Parameters<typeof handleDragEnd>[0]) => {
      handleDragEnd(args)
      setActiveDragId(null)
      setActiveDragDate(null)
      setDragCrossedBoundary(false)
    },
    [handleDragEnd],
  )

  const handleResizeStart = useCallback(
    (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => {
      e.preventDefault()
      const reservation = state.reservations.find((r) => r.public_id === reservationId)
      if (!reservation) return

      if (reservation.status === "completed") return
      if (reservation.status === "active" && edge === "start") return

      const dateKey = isoToDateKey(reservation.start_at)
      setActiveDragDate(dateKey)

      const dayRange = dayRanges[dateKey] ?? computeDayHourRange(dateKey, workingHours)
      const startX = e.clientX
      const edgeTime = new Date(edge === "start" ? reservation.start_at : reservation.end_at)
      const edgeMinutesFromMidnight = edgeTime.getHours() * 60 + edgeTime.getMinutes()
      const startMinutes =
        edgeMinutesFromMidnight < dayRange.hourStart * 60
          ? edgeMinutesFromMidnight + 24 * 60
          : edgeMinutesFromMidnight
      const totalMinutes = (dayRange.hourEnd - dayRange.hourStart) * 60

      const dayEl = (e.target as HTMLElement).closest(".scheduler__day-panel-body")
      if (!dayEl) return
      const rowEl = (e.target as HTMLElement).closest(".scheduler__table-row-cells")
      if (!rowEl) return
      const rowWidth = rowEl.getBoundingClientRect().width

      const onMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.clientX - startX
        const dMinute = Math.round(((dx / rowWidth) * totalMinutes) / SLOT_MINUTES) * SLOT_MINUTES

        const totalMin = startMinutes + dMinute
        const clamped = Math.max(dayRange.hourStart * 60, totalMin)

        const currentRes = reservationsRef.current
        const currentChanges = pendingChangesRef.current
        const res = currentRes.find((r) => r.public_id === reservationId)
        if (!res) return

        const curStart = new Date(res.start_at)
        const curEnd = new Date(res.end_at)

        let effectiveClamped = clamped
        if (edge === "end") {
          const curStartMinutes = curStart.getHours() * 60 + curStart.getMinutes()
          effectiveClamped = Math.max(clamped, curStartMinutes + SLOT_MINUTES)
        }
        if (res.status === "active" && edge === "end") {
          const now = new Date()
          const nowMinutes = now.getHours() * 60 + now.getMinutes()
          effectiveClamped = Math.max(effectiveClamped, nowMinutes + SLOT_MINUTES)
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

        resizeReservation(reservationId, edge, `${ehh}:${emm}`)
      }

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
        setActiveDragDate(null)

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
      workingHours,
      restaurantTimezone,
      dayRanges,
    ],
  )

  const handleSave = useCallback(async () => {
    if (
      !restaurantId ||
      (state.pendingChanges.length === 0 && state.pendingCancellationIds.length === 0)
    )
      return

    setSaving(true)
    clearConflict()

    try {
      const payload = {
        changes: state.pendingChanges.map((c) => {
          const utcStart = localToISOString(c.new_date, c.new_start_time)
          const utcEnd = localToISOString(c.new_end_date ?? c.new_date, c.new_end_time)
          return {
            reservation_id: c.reservation_id,
            new_table_id: c.new_table_id,
            new_date: utcStart.slice(0, 10),
            new_start_time: utcStart.slice(11, 16),
            new_end_time: utcEnd.slice(11, 16),
          }
        }),
        cancellations:
          state.pendingCancellationIds.length > 0 ? state.pendingCancellationIds : undefined,
      }

      const result = await batchUpdateReservations(payload)

      if (result.ok) {
        handleCommitChanges()
        refetch()
        toast.success("Reservations updated successfully.")
      } else {
        toast.error(result.message)
        if (result.conflicting_reservation_id) {
          markConflict(result.conflicting_reservation_id)
        }
      }
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }, [
    restaurantId,
    state.pendingChanges,
    state.pendingCancellationIds,
    setSaving,
    clearConflict,
    handleCommitChanges,
    refetch,
    toast,
    markConflict,
  ])

  const pendingCancelReservation = pendingCancelConfirmId
    ? state.reservations.find((r) => r.public_id === pendingCancelConfirmId)
    : null

  if (!restaurantId) {
    return <div className="scheduler__empty">No restaurant selected.</div>
  }

  return (
    <div className="scheduler">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEndWithClear}
      >
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
            <div className="scheduler__toolbar-nav-divider" />
            <CancelZone
              activeDragId={activeDragId}
              pendingCancellationIds={state.pendingCancellationIds}
            />
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

        {externalUpdate && (
          <div className="scheduler__stale-banner">
            <span className="scheduler__stale-banner-text">
              Reservation data changed externally. Your unsaved changes may conflict.
            </span>
            <div className="scheduler__stale-banner-actions">
              <button
                type="button"
                className="scheduler__stale-banner-btn scheduler__stale-banner-btn--primary"
                onClick={discardExternalUpdate}
              >
                Discard &amp; reload
              </button>
              <button
                type="button"
                className="scheduler__stale-banner-btn"
                onClick={dismissExternalUpdate}
              >
                Continue editing
              </button>
            </div>
          </div>
        )}

        {loading && <div className="scheduler__loading">Loading...</div>}
        {error && <div className="scheduler__error">{error}</div>}

        {!loading && !error && (
          <>
            <div className={`scheduler__grid scheduler__grid--${dates.length}`}>
              {dates.map((date, i) => {
                const bounds = getDayWorkingBounds(date, workingHours)
                return (
                  <DayPanel
                    key={date}
                    date={date}
                    tables={tables}
                    reservations={state.reservations}
                    crossDayInfo={crossDayInfoByDate[date] ?? {}}
                    hourStart={dayRanges[date]?.hourStart ?? bounds.start}
                    hourEnd={dayRanges[date]?.hourEnd ?? bounds.end}
                    workingHourStart={bounds.start}
                    workingHourEnd={bounds.end}
                    conflictReservationId={state.conflictReservationId}
                    modifiedIds={modifiedIds}
                    cancellingIds={cancellingIds}
                    onResizeStart={handleResizeStart}
                    scrollRef={i === 0 ? scrollRefA : scrollRefB}
                    showNav={dates.length === 2}
                    onPrevDay={() => shiftDate(i, -1)}
                    onNextDay={() => shiftDate(i, 1)}
                  />
                )
              })}
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
          </>
        )}
      </DndContext>

      <SaveBar
        changeCount={state.pendingChanges.length}
        cancellationCount={state.pendingCancellationIds.length}
        saving={state.saving}
        onSave={handleSave}
        onReset={handleResetChanges}
      />

      {pendingNavAction && (
        <ConfirmDialog
          title="Unsaved changes"
          message="You have unsaved changes. Discard them and continue?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          tone="danger"
          onConfirm={() => {
            clearPending()
            pendingNavAction()
            setPendingNavAction(null)
          }}
          onClose={() => setPendingNavAction(null)}
        />
      )}

      {pendingCancelConfirmId && pendingCancelReservation && (
        <ConfirmDialog
          title="Complete active reservation?"
          message={`${pendingCancelReservation.customer_name} at table ${pendingCancelReservation.table_number} has an active session with a bill. Complete it anyway?`}
          confirmLabel="Complete"
          cancelLabel="Keep"
          tone="danger"
          onConfirm={() => {
            cancelReservation(pendingCancelConfirmId)
            setPendingCancelConfirmId(null)
          }}
          onClose={() => setPendingCancelConfirmId(null)}
        />
      )}
    </div>
  )
}
