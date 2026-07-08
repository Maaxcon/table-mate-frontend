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

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

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
