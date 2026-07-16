/// <reference types="node" />
import { describe, it, expect, beforeAll } from "vitest"

beforeAll(() => {
  process.env.TZ = "UTC"
})
import type { SchedulerReservation, PendingChange } from "../types"

interface TimeRange {
  table_id: string
  date: string
  start_minutes: number
  end_minutes: number
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  if (a.table_id !== b.table_id) return false
  if (a.date === b.date) {
    if (a.end_minutes <= a.start_minutes) {
      return a.start_minutes < b.end_minutes || b.start_minutes < a.end_minutes
    }
    if (b.end_minutes <= b.start_minutes) {
      return b.start_minutes < a.end_minutes || a.start_minutes < b.end_minutes
    }
    return a.start_minutes < b.end_minutes && a.end_minutes > b.start_minutes
  }
  const [aY, aM, aD] = a.date.split("-").map(Number)
  const [bY, bM, bD] = b.date.split("-").map(Number)
  const aDate = new Date(aY, aM - 1, aD)
  const bDate = new Date(bY, bM - 1, bD)
  const diff = Math.round((aDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24))
  if (Math.abs(diff) !== 1) return false
  if (diff === 1 && b.end_minutes < b.start_minutes) {
    const aEnd = a.end_minutes < a.start_minutes ? a.end_minutes + 24 * 60 : a.end_minutes
    return a.start_minutes < b.end_minutes && aEnd > 0
  }
  if (diff === -1 && a.end_minutes < a.start_minutes) {
    const bEnd = b.end_minutes < b.start_minutes ? b.end_minutes + 24 * 60 : b.end_minutes
    return b.start_minutes < a.end_minutes && bEnd > 0
  }
  return false
}

function isoToDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
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

function checkOverlap(
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

function checkOrderingViolation(
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

function checkOperatingHours(
  proposed: TimeRange,
  workingHours: Record<string, { open: string; close: string }> | null,
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

const resA: SchedulerReservation = {
  public_id: "res-a",
  table: "t1",
  table_number: "1",
  customer_name: "A",
  guest_count: 2,
  start_at: "2026-07-02T10:00:00.000Z",
  end_at: "2026-07-02T12:00:00.000Z",
  opened_at: null,
  status: "pending",
}

const resB: SchedulerReservation = {
  public_id: "res-b",
  table: "t1",
  table_number: "1",
  customer_name: "B",
  guest_count: 2,
  start_at: "2026-07-02T12:00:00.000Z",
  end_at: "2026-07-02T14:00:00.000Z",
  opened_at: null,
  status: "pending",
}

describe("checkOverlap", () => {
  it("returns false for non-overlapping reservations on same table", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 14 * 60,
      end_minutes: 15 * 60,
    }
    expect(checkOverlap(proposed, [resA, resB], [])).toBe(false)
  })

  it("returns true for overlapping reservations on same table", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 11 * 60,
      end_minutes: 13 * 60,
    }
    expect(checkOverlap(proposed, [resA, resB], [])).toBe(true)
  })

  it("returns true for partially overlapping reservation", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 11 * 60,
      end_minutes: 11 * 60 + 30,
    }
    expect(checkOverlap(proposed, [resA, resB], [])).toBe(true)
  })

  it("returns false for same-time on different tables", () => {
    const proposed: TimeRange = {
      table_id: "t2",
      date: "2026-07-02",
      start_minutes: 11 * 60,
      end_minutes: 12 * 60,
    }
    expect(checkOverlap(proposed, [resA, resB], [])).toBe(false)
  })

  it("returns false when excluding the overlapping reservation", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 10 * 60,
      end_minutes: 12 * 60,
    }
    expect(checkOverlap(proposed, [resA, resB], [], "res-a")).toBe(false)
  })

  it("detects overlap with pending changes", () => {
    const change: PendingChange = {
      reservation_id: "res-c",
      original_table: "t2",
      original_table_number: "2",
      original_start_at: "2026-07-02T10:00:00.000Z",
      original_end_at: "2026-07-02T12:00:00.000Z",
      new_table_id: "t1",
      new_table_number: "1",
      new_date: "2026-07-02",
      new_start_time: "10:00",
      new_end_time: "12:00",
      customer_name: "C",
      guest_count: 2,
      opened_at: null,
      status: "pending",
    }
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 11 * 60,
      end_minutes: 12 * 60,
    }
    expect(checkOverlap(proposed, [], [change])).toBe(true)
  })
})

describe("overlaps (cross-day / cross-midnight)", () => {
  it("returns true for same-date cross-midnight overlap when a wraps", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 22 * 60,
      end_minutes: 2 * 60,
    }
    const existing: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 60,
      end_minutes: 5 * 60,
    }
    expect(overlaps(proposed, existing)).toBe(true)
  })

  it("returns false for same-date cross-midnight when b wraps but no overlap", () => {
    const a: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 2 * 60,
      end_minutes: 5 * 60,
    }
    const b: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 23 * 60,
      end_minutes: 60,
    }
    expect(overlaps(a, b)).toBe(false)
  })

  it("returns false for cross-date adjacent reservations without wrap", () => {
    const a: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 22 * 60,
      end_minutes: 23 * 60,
    }
    const b: TimeRange = {
      table_id: "t1",
      date: "2026-07-06",
      start_minutes: 60,
      end_minutes: 3 * 60,
    }
    expect(overlaps(a, b)).toBe(false)
  })

  it("returns true for cross-date adjacent overlap when a wraps across midnight", () => {
    const a: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 22 * 60,
      end_minutes: 2 * 60,
    }
    const b: TimeRange = {
      table_id: "t1",
      date: "2026-07-06",
      start_minutes: 60,
      end_minutes: 3 * 60,
    }
    expect(overlaps(a, b)).toBe(true)
  })

  it("returns false for non-adjacent dates", () => {
    const a: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 10 * 60,
      end_minutes: 12 * 60,
    }
    const b: TimeRange = {
      table_id: "t1",
      date: "2026-07-07",
      start_minutes: 10 * 60,
      end_minutes: 12 * 60,
    }
    expect(overlaps(a, b)).toBe(false)
  })

  it("returns false for different tables regardless of cross-date", () => {
    const a: TimeRange = {
      table_id: "t1",
      date: "2026-07-05",
      start_minutes: 22 * 60,
      end_minutes: 2 * 60,
    }
    const b: TimeRange = {
      table_id: "t2",
      date: "2026-07-06",
      start_minutes: 60,
      end_minutes: 3 * 60,
    }
    expect(overlaps(a, b)).toBe(false)
  })
})

describe("checkOrderingViolation", () => {
  const activeRes: SchedulerReservation = {
    ...resA,
    table: "t1",
    status: "active",
    opened_at: "2026-07-02T04:00:00.000Z",
  }

  it("returns null when no active reservations on same table", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 8 * 60,
      end_minutes: 9 * 60,
    }
    expect(checkOrderingViolation(proposed, [resA], "res-b")).toBeNull()
  })

  it("returns reason when placing before a seated party", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 0,
      end_minutes: 60,
    }
    expect(checkOrderingViolation(proposed, [activeRes])).toBe("Cannot place before a seated party")
  })

  it("returns null when placing after a seated party", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 14 * 60,
      end_minutes: 15 * 60,
    }
    expect(checkOrderingViolation(proposed, [activeRes])).toBeNull()
  })

  it("returns null when excluding the active reservation", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 0,
      end_minutes: 60,
    }
    expect(checkOrderingViolation(proposed, [activeRes], activeRes.public_id)).toBeNull()
  })

  it("ignores non-active reservations", () => {
    const pendingRes: SchedulerReservation = {
      ...resA,
      opened_at: "2026-07-02T04:00:00.000Z",
    }
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 0,
      end_minutes: 60,
    }
    expect(checkOrderingViolation(proposed, [pendingRes])).toBeNull()
  })
})

describe("checkOperatingHours", () => {
  const workingHours = {
    mon: { open: "09:00", close: "23:00" },
    tue: { open: "09:00", close: "23:00" },
    wed: { open: "09:00", close: "23:00" },
    thu: { open: "09:00", close: "23:00" },
    fri: { open: "09:00", close: "01:00" },
    sat: { open: "10:00", close: "02:00" },
    sun: { open: "10:00", close: "22:00" },
  }

  it("returns null when within hours", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 12 * 60,
      end_minutes: 14 * 60,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBeNull()
  })

  it("returns reason when starting before opening time", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 8 * 60,
      end_minutes: 10 * 60,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBe("Cannot start before opening time")
  })

  it("returns reason when ending after closing time", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 22 * 60,
      end_minutes: 23 * 60 + 30,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBe("Cannot end after closing time")
  })

  it("returns null when no working hours provided", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-02",
      start_minutes: 0,
      end_minutes: 60,
    }
    expect(checkOperatingHours(proposed, null)).toBeNull()
  })

  it("returns null for overnight hours within window (fri 10:00-00:00)", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-03",
      start_minutes: 22 * 60,
      end_minutes: 23 * 60 + 30,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBeNull()
  })

  it("returns null for overnight hours at midnight boundary", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-03",
      start_minutes: 23 * 60,
      end_minutes: 24 * 60,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBeNull()
  })

  it("returns null for daytime hours on overnight day", () => {
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-03",
      start_minutes: 14 * 60,
      end_minutes: 16 * 60,
    }
    expect(checkOperatingHours(proposed, workingHours)).toBeNull()
  })

  it("returns reason when outside overnight window", () => {
    const closedHours = {
      mon: { open: "10:00", close: "00:00" },
    }
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-06",
      start_minutes: 2 * 60,
      end_minutes: 4 * 60,
    }
    expect(checkOperatingHours(proposed, closedHours)).toBe("Restaurant is closed on this day")
  })

  it("returns null for close=00:00 (seeded data format)", () => {
    const seededHours = {
      fri: { open: "10:00", close: "00:00" },
      sat: { open: "10:00", close: "00:00" },
    }
    const proposed: TimeRange = {
      table_id: "t1",
      date: "2026-07-03",
      start_minutes: 18 * 60,
      end_minutes: 20 * 60,
    }
    expect(checkOperatingHours(proposed, seededHours)).toBeNull()
  })
})
