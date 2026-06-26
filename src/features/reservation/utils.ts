import type { WorkingHoursDay } from "./api"

export const MIN_DURATION = 30

export const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

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
  const offset = tzOffsetMinutes(new Date(naiveUtc), timeZone)
  return new Date(naiveUtc - offset * 60000).toISOString()
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function generateTimeSlots(date: Date, dayConfig: WorkingHoursDay | undefined): string[] {
  if (!dayConfig) return []

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return { h, m }
  }

  const open = parseTime(dayConfig.open)
  const close = parseTime(dayConfig.close)

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const slots: string[] = []
  let hour = open.h
  let minute = open.m

  const closeTotal = close.h * 60 + close.m
  const openTotal = open.h * 60 + open.m
  const overnight = closeTotal <= openTotal
  const endBase = overnight ? closeTotal + 24 * 60 : closeTotal

  while (hour * 60 + minute < endBase) {
    const hh = String(hour % 24).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    const slotTotal = hour * 60 + minute

    if (!isToday || slotTotal > now.getHours() * 60 + now.getMinutes()) {
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
