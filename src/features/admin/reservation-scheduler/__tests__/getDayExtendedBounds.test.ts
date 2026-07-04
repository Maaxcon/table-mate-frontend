import { describe, it, expect, beforeAll } from "vitest"

beforeAll(() => {
  process.env.TZ = "UTC"
})

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function getDayExtendedBounds(
  date: string,
  workingHours: Record<string, { open: string; close: string }> | null,
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
  const nextOpen = nextHours ? toMinutes(nextHours.open) : null

  const thisOpen = openMin

  let minHour = 0
  if (prevClose != null) {
    const prevCloseAdjusted = prevClose <= thisOpen ? prevClose : prevClose - 24 * 60
    minHour = Math.floor(prevCloseAdjusted / 60)
  }

  let maxHour = 24
  if (nextOpen != null) {
    const nextOpenAdjusted = nextOpen + 24 * 60
    maxHour = Math.ceil(nextOpenAdjusted / 60)
  }

  return { minHour, maxHour }
}

describe("getDayExtendedBounds", () => {
  const wh = {
    sun: { open: "10:00", close: "22:00" },
    sat: { open: "10:00", close: "23:00" },
    mon: { open: "09:00", close: "21:00" },
  }

  it("returns null when workingHours is null", () => {
    expect(getDayExtendedBounds("2026-07-05", null)).toBeNull()
  })

  it("returns null when day key is missing from workingHours", () => {
    expect(getDayExtendedBounds("2026-07-05", {})).toBeNull()
  })

  it("extends left to prev close and right to next open for normal hours", () => {
    const result = getDayExtendedBounds("2026-07-05", wh)
    expect(result).toEqual({ minHour: -1, maxHour: 33 })
  })

  it("sets minHour from prev close when prev closes before this opens", () => {
    const whEarlyClose = {
      ...wh,
      sat: { open: "06:00", close: "08:00" },
    }
    const result = getDayExtendedBounds("2026-07-05", whEarlyClose)
    expect(result?.minHour).toBe(8)
    expect(result?.maxHour).toBe(33)
  })

  it("handles overnight target day (close < open)", () => {
    const whOvernight = {
      ...wh,
      sun: { open: "10:00", close: "02:00" },
    }
    const result = getDayExtendedBounds("2026-07-05", whOvernight)
    expect(result).toEqual({ minHour: -1, maxHour: 33 })
  })

  it("sets minHour to 0 when there is no previous day data", () => {
    const whNoPrev = {
      sun: { open: "10:00", close: "22:00" },
      mon: { open: "09:00", close: "21:00" },
    }
    const result = getDayExtendedBounds("2026-07-05", whNoPrev)
    expect(result?.minHour).toBe(0)
    expect(result?.maxHour).toBe(33)
  })

  it("keeps maxHour at 24 when there is no next day data", () => {
    const whNoNext = {
      sun: { open: "10:00", close: "22:00" },
      sat: { open: "10:00", close: "23:00" },
    }
    const result = getDayExtendedBounds("2026-07-05", whNoNext)
    expect(result?.minHour).toBe(-1)
    expect(result?.maxHour).toBe(24)
  })
})
