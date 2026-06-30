import type { PendingChange, SchedulerReservation } from "../types"
import { isoToDateKey } from "../types"

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

export type { TimeRange }
