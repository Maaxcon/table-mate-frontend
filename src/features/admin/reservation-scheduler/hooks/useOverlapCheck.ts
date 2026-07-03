import type { PendingChange, SchedulerReservation } from "../types"
import { isoToDateKey } from "../types"

export interface WorkingHoursDay {
  open: string
  close: string
}

interface TimeRange {
  table_id: string
  date: string
  start_minutes: number
  end_minutes: number
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  if (a.table_id !== b.table_id || a.date !== b.date) return false
  return a.start_minutes < b.end_minutes && a.end_minutes > b.start_minutes
}

function reservationToRange(r: SchedulerReservation, date: string): TimeRange {
  const start = new Date(r.start_at)
  const end = new Date(r.end_at)
  return {
    table_id: r.table,
    date,
    start_minutes: start.getHours() * 60 + start.getMinutes(),
    end_minutes: end.getHours() * 60 + end.getMinutes(),
  }
}

function changeToRange(c: PendingChange): TimeRange {
  const [sh, sm] = c.new_start_time.split(":").map(Number)
  const [eh, em] = c.new_end_time.split(":").map(Number)
  return {
    table_id: c.new_table_id,
    date: c.new_date,
    start_minutes: sh * 60 + sm,
    end_minutes: eh * 60 + em,
  }
}

export function checkOverlap(
  proposed: TimeRange,
  reservations: SchedulerReservation[],
  pendingChanges: PendingChange[],
  excludeReservationId?: string,
): boolean {
  for (const r of reservations) {
    if (r.public_id === excludeReservationId) continue
    if (overlaps(proposed, reservationToRange(r, isoToDateKey(r.start_at)))) return true
  }
  for (const c of pendingChanges) {
    if (c.reservation_id === excludeReservationId) continue
    if (overlaps(proposed, changeToRange(c))) return true
  }
  return false
}

export function checkOrderingViolation(
  proposed: TimeRange,
  reservations: SchedulerReservation[],
  excludeReservationId?: string,
): string | null {
  for (const r of reservations) {
    if (r.public_id === excludeReservationId) continue
    if (r.status !== "active") continue
    if (r.table !== proposed.table_id) continue
    if (!r.opened_at) continue
    if (isoToDateKey(r.start_at) !== proposed.date) continue
    const openedAt = new Date(r.opened_at)
    const openedMinutes = openedAt.getHours() * 60 + openedAt.getMinutes()
    if (openedMinutes > proposed.start_minutes) {
      return "Cannot place before a seated party"
    }
  }
  return null
}

const DAY_KEYS: Record<string, string> = {
  sun: "sun",
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
}

function dateToDayKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const short = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase()
  return DAY_KEYS[short] ?? "monday"
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function checkOperatingHours(
  proposed: TimeRange,
  workingHours: Record<string, WorkingHoursDay> | null,
): string | null {
  if (!workingHours) return null
  const dayKey = dateToDayKey(proposed.date)
  const dayHours = workingHours[dayKey]
  if (!dayHours) return "Restaurant is closed on this day"
  const openMin = hhmmToMinutes(dayHours.open)
  const closeMin = hhmmToMinutes(dayHours.close)

  if (closeMin > openMin) {
    if (proposed.start_minutes < openMin) return "Cannot start before opening time"
    if (proposed.end_minutes > closeMin) return "Cannot end after closing time"
  } else {
    if (proposed.start_minutes < openMin && proposed.end_minutes > closeMin) {
      return "Restaurant is closed on this day"
    }
  }
  return null
}

export function checkPastTimeViolation(
  proposed: TimeRange,
  status?: string,
  restaurantTimezone?: string,
): string | null {
  if (status === "active") return null

  const now = restaurantTimezone
    ? new Date(
        new Intl.DateTimeFormat("en-US", {
          timeZone: restaurantTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      )
    : new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  if (proposed.date < todayKey) return "Cannot move to a past date"
  if (proposed.date === todayKey) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (proposed.start_minutes < nowMinutes) {
      return "Cannot move to a past time"
    }
  }
  return null
}

export type { TimeRange }
