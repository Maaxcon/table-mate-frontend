import type { WorkingHoursDay } from "./api"
import { bookStrings } from "./strings"

export const MIN_DURATION = 30

// Default booking length (minutes). Shared so the floor-plan availability probe
// and the booking modal's initial duration stay in lockstep — otherwise the map
// could mark a slot free/taken on a different window than the modal validates.
export const DEFAULT_DURATION = 120

// Default party size — shared across the floor picker, the floor plan's capacity
// filter and the booking modal so they all start from the same number.
export const DEFAULT_GUESTS = 2

// Keyed to match the stored working_hours format (3-letter, mon–sun), indexed
// by Date.getDay() where 0 = Sunday.
export const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// Offset (minutes, east-positive) of `timeZone` at the given instant, read via Intl.
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value)
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour % 24, map.minute, map.second)
  return (asUtc - instant.getTime()) / 60000
}

// Interprets `dateKey` (YYYY-MM-DD) + `time` (HH:MM) as wall-clock time in the
// restaurant's `timeZone` and returns the matching UTC instant as an ISO string.
export function zonedWallTimeToUtcIso(dateKey: string, time: string, timeZone: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number)
  const [h, mi] = time.split(":").map(Number)
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi)
  // Two-pass: reading the offset at `naiveUtc` itself is only a first
  // approximation (it treats the wall-clock time as if it were already UTC,
  // which can land on the wrong side of a DST transition). Apply that offset
  // once to get close to the real instant, then re-read the offset there —
  // near a spring-forward/fall-back boundary the two passes can disagree by
  // an hour, and the second reading is the one that reflects DST at the
  // actual target moment.
  const firstOffset = tzOffsetMinutes(new Date(naiveUtc), timeZone)
  const candidate = naiveUtc - firstOffset * 60000
  const secondOffset = tzOffsetMinutes(new Date(candidate), timeZone)
  return new Date(naiveUtc - secondOffset * 60000).toISOString()
}

// The calendar date a slot actually falls on. On an overnight day (close <= open)
// the backend lists after-midnight slots (e.g. "01:00" when the venue opens 18:00)
// under the opening day's key, but they belong to the NEXT day. Advance the date
// for those so the booked instant matches what the guest picked.
export function slotDateKey(
  date: Date,
  time: string,
  dayConfig: WorkingHoursDay | undefined,
): string {
  if (dayConfig) {
    const openMins = timeToMinutes(dayConfig.open)
    const closeMins = timeToMinutes(dayConfig.close)
    const overnight = closeMins <= openMins
    if (overnight && timeToMinutes(time) < openMins) {
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      return localDateKey(next)
    }
  }
  return localDateKey(date)
}

// Shared by BookModal and RescheduleModal: is [windowStartMins, endMins) a
// bookable window? Checked against the day's closing time and, when
// `availableSlotTimes` is given, every 30-min slot in the window. Callers that
// want to skip the slot-availability check (e.g. prolonging an active
// booking, where only the closing-time bound applies) pass null.
export function getDurationError(
  windowStartMins: number,
  endMins: number,
  dayConfig: WorkingHoursDay | undefined,
  availableSlotTimes: string[] | null,
): string | null {
  if (dayConfig) {
    const closeMins = timeToMinutes(dayConfig.close)
    const openMins = timeToMinutes(dayConfig.open)
    const overnight = closeMins <= openMins
    if (!overnight && endMins > closeMins) {
      return bookStrings.modal.validation.closingExceeded(dayConfig.close)
    }
  }

  if (availableSlotTimes) {
    for (let m = windowStartMins; m < endMins; m += 30) {
      if (!availableSlotTimes.includes(minutesToTime(m))) {
        return bookStrings.modal.validation.durationUnavailable
      }
    }
  }

  return null
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Format an ISO instant as HH:MM in the restaurant's timezone (falls back to the
// browser's zone when unknown), so a guest in another zone sees the venue's time.
export function formatTimeInTz(iso: string, timeZone: string | null): string {
  return new Date(iso).toLocaleTimeString("uk-UA", {
    timeZone: timeZone ?? undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// "Today" as a local Date (midnight, device-local fields) but keyed to the
// restaurant's calendar day, not the guest's. A guest whose device clock is a
// day ahead/behind the venue must still browse/query the venue's "today".
export function todayInTz(timeZone: string | null): Date {
  const { year, month, day } = nowInTz(timeZone)
  return new Date(year, month - 1, day)
}

// "Now" as wall-clock calendar parts in `timeZone` (falls back to the browser's
// zone) — so the past-slot filter below compares the venue's clock, not the
// guest's device clock.
function nowInTz(timeZone: string | null): {
  year: number
  month: number
  day: number
  minutes: number
} {
  const now = new Date()
  if (!timeZone) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      minutes: now.getHours() * 60 + now.getMinutes(),
    }
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now)
  const m: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = Number(p.value)
  }
  return { year: m.year, month: m.month, day: m.day, minutes: (m.hour % 24) * 60 + m.minute }
}

export function generateTimeSlots(
  date: Date,
  dayConfig: WorkingHoursDay | undefined,
  timeZone: string | null = null,
): string[] {
  if (!dayConfig) return []

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return { h, m }
  }

  const open = parseTime(dayConfig.open)
  const close = parseTime(dayConfig.close)

  // The slots are the restaurant's wall-clock times, so "today" and the past
  // cutoff must be measured in the restaurant's timezone too.
  const now = nowInTz(timeZone)
  const isToday =
    date.getFullYear() === now.year &&
    date.getMonth() + 1 === now.month &&
    date.getDate() === now.day

  const slots: string[] = []
  let hour = open.h
  let minute = open.m

  const closeTotal = close.h * 60 + close.m
  const openTotal = open.h * 60 + open.m
  const overnight = closeTotal <= openTotal
  const endBase = overnight ? closeTotal + 24 * 60 : closeTotal

  // Slots past midnight live on an extended timeline (24:00 = 1440+). Put "now"
  // on the same timeline: for an overnight day, an early-morning "now" still
  // belongs to the session that opened the evening before, so shift it by a day.
  const nowTotal = overnight && now.minutes < openTotal ? now.minutes + 24 * 60 : now.minutes

  while (hour * 60 + minute < endBase) {
    const hh = String(hour % 24).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    const slotTotal = hour * 60 + minute

    if (!isToday || slotTotal > nowTotal) {
      slots.push(`${hh}:${mm}`)
    }

    minute += 30
    if (minute >= 60) {
      hour += 1
      minute = 0
    }
  }

  return slots
}
