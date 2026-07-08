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

// True if Intl actually recognizes `tz` as a timezone name — the browser
// throws a RangeError on a bad one rather than returning something falsy.
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// Mirrors the backend's _safe_zoneinfo fallback: a misconfigured restaurant
// timezone (typo, bad migration, manual DB edit) must not crash every screen
// that formats a wall-clock time — and it must fall back to UTC specifically
// (not the browser's own zone), or the two sides silently disagree on the
// resulting instant instead of both degrading to the same one. `null`/empty
// is left alone (a genuinely unknown timezone, e.g. settings still loading,
// is a different case from a bad one and keeps its existing browser-local
// fallback in the functions below).
export function safeTimeZone(tz: string | null | undefined): string | null {
  if (!tz) return null
  return isValidTimeZone(tz) ? tz : "UTC"
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
//
// Mirrors Python's fold=0 semantics — what the backend's naive
// `datetime(..., tzinfo=tz)` uses — so both sides resolve DST edge cases to
// the SAME instant: the repeated fall-back hour maps to its FIRST occurrence,
// and a time inside the spring-forward gap resolves with the pre-transition
// offset. Sample the offset a day before/after the wall time; a candidate
// instant is real when the offset actually in effect there matches the offset
// used to build it.
export function zonedWallTimeToUtcIso(dateKey: string, time: string, timeZone: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number)
  const [h, mi] = time.split(":").map(Number)
  const naiveUtc = Date.UTC(y, mo - 1, d, h, mi)
  const tz = safeTimeZone(timeZone) ?? "UTC"
  const DAY_MS = 24 * 60 * 60000

  const preOffset = tzOffsetMinutes(new Date(naiveUtc - DAY_MS), tz)
  const preCandidate = naiveUtc - preOffset * 60000
  // Self-consistent under the pre-transition offset: an ordinary time, or the
  // first occurrence of an ambiguous fall-back time — fold=0 picks this one.
  if (tzOffsetMinutes(new Date(preCandidate), tz) === preOffset) {
    return new Date(preCandidate).toISOString()
  }

  const postOffset = tzOffsetMinutes(new Date(naiveUtc + DAY_MS), tz)
  const postCandidate = naiveUtc - postOffset * 60000
  if (tzOffsetMinutes(new Date(postCandidate), tz) === postOffset) {
    return new Date(postCandidate).toISOString()
  }

  // Neither offset is self-consistent: the wall time sits in the
  // spring-forward gap. fold=0 resolves it with the pre-transition offset.
  return new Date(preCandidate).toISOString()
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
// Longest booking that still ends by closing time, for a window anchored at
// `startTime`. Overnight days (close <= open) count on the extended timeline
// (close + 24h), with after-midnight starts shifted onto it. Infinity when
// there's no day config to cap against. Shared by BookModal and
// RescheduleModal so both auto-cap a late slot instead of erroring.
export function maxDurationBeforeClose(
  startTime: string | null,
  dayConfig: WorkingHoursDay | undefined,
): number {
  if (!startTime || !dayConfig) return Infinity
  const openMins = timeToMinutes(dayConfig.open)
  const closeMins = timeToMinutes(dayConfig.close)
  const overnight = closeMins <= openMins
  const closeBase = overnight ? closeMins + 24 * 60 : closeMins
  let slotMins = timeToMinutes(startTime)
  if (overnight && slotMins < openMins) slotMins += 24 * 60
  return Math.max(MIN_DURATION, closeBase - slotMins)
}

export function getDurationError(
  windowStartMins: number,
  endMins: number,
  dayConfig: WorkingHoursDay | undefined,
  availableSlotTimes: string[] | null,
): string | null {
  if (dayConfig) {
    const openMins = timeToMinutes(dayConfig.open)
    const closeMins = timeToMinutes(dayConfig.close)
    const overnight = closeMins <= openMins
    // Same extended timeline as BookModal's maxDuration / the backend's
    // availability action (close + 24h): an after-midnight window start
    // shifts onto it too, so e.g. 01:00+180min compares against the real
    // 02:00-next-day close instead of always passing (the previous
    // `!overnight &&` guard skipped this check for every overnight day,
    // whether the window started before or after midnight).
    const closeBase = overnight ? closeMins + 24 * 60 : closeMins
    const shift = overnight && windowStartMins < openMins ? 24 * 60 : 0
    if (endMins + shift > closeBase) {
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

// Rounds each slot up to the nearest 30-min boundary and dedupes, then sorts
// chronologically on an overnight-aware timeline: times before 6am sort as if
// they were 24h later, so an overnight day's after-midnight tail (e.g. 01:00)
// displays after its evening slots (e.g. 22:00) instead of before them.
export function normalizeSlots(slots: string[]): string[] {
  const set = new Set<string>()
  for (const s of slots) {
    const mins = timeToMinutes(s)
    const normalized = Math.ceil(mins / 30) * 30
    set.add(minutesToTime(normalized))
  }
  const BREAK = 6 * 60
  return [...set].sort((a, b) => {
    const ma = timeToMinutes(a)
    const mb = timeToMinutes(b)
    return (ma < BREAK ? ma + 1440 : ma) - (mb < BREAK ? mb + 1440 : mb)
  })
}

// Format an ISO instant as HH:MM in the restaurant's timezone (falls back to the
// browser's zone when unknown), so a guest in another zone sees the venue's time.
export function formatTimeInTz(iso: string, timeZone: string | null): string {
  return new Date(iso).toLocaleTimeString("uk-UA", {
    timeZone: safeTimeZone(timeZone) ?? undefined,
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

// The venue-local calendar day (as a local-midnight Date) of an ISO instant —
// same convention as todayInTz, for arbitrary instants.
export function dateInTz(iso: string, timeZone: string | null): Date {
  const d = new Date(iso)
  const tz = safeTimeZone(timeZone)
  if (!tz) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const m: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = Number(p.value)
  }
  return new Date(m.year, m.month - 1, m.day)
}

// Inverse of slotDateKey: the venue-local OPENING day a stored instant belongs
// to. A post-midnight instant on an overnight day is keyed by the backend (and
// slotDateKey) under the PREVIOUS venue day, so step back one day when the
// previous day's config runs overnight and this wall time is before its
// opening — then slotDateKey advances it forward exactly once, round-tripping
// cleanly.
export function openingDayOfInstant(
  iso: string,
  timeZone: string | null,
  workingHours: Record<string, WorkingHoursDay> | null,
): Date {
  const day = dateInTz(iso, timeZone)
  const wallMins = timeToMinutes(formatTimeInTz(iso, timeZone))
  const prev = new Date(day)
  prev.setDate(prev.getDate() - 1)
  const prevConfig = workingHours?.[DAY_NAMES[prev.getDay()]]
  if (prevConfig) {
    const openMins = timeToMinutes(prevConfig.open)
    const closeMins = timeToMinutes(prevConfig.close)
    if (closeMins <= openMins && wallMins < openMins) return prev
  }
  return day
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
  const tz = safeTimeZone(timeZone)
  if (!tz) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      minutes: now.getHours() * 60 + now.getMinutes(),
    }
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
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
