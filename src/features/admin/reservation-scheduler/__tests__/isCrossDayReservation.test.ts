/// <reference types="node" />
import { describe, it, expect, beforeAll } from "vitest"

beforeAll(() => {
  process.env.TZ = "UTC"
})

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function isoToDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
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

function isCrossDayReservation(
  resStartAt: string,
  resEndAt: string,
  date: string,
  workingHours: Record<string, { open: string; close: string }> | null,
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

const wh = {
  sun: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "23:00" },
  mon: { open: "09:00", close: "21:00" },
}

describe("isCrossDayReservation", () => {
  it("returns null when reservation starts on the same date", () => {
    const result = isCrossDayReservation(
      "2026-07-05T14:00:00.000Z",
      "2026-07-05T15:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBeNull()
  })

  it("returns 'next' when reservation starts on the next day within extended bounds", () => {
    const result = isCrossDayReservation(
      "2026-07-06T01:00:00.000Z",
      "2026-07-06T02:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBe("next")
  })

  it("returns null when reservation starts on the next day outside extended bounds", () => {
    const result = isCrossDayReservation(
      "2026-07-06T10:00:00.000Z",
      "2026-07-06T11:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBeNull()
  })

  it("returns 'prev' when reservation ends on current date before opening time", () => {
    const result = isCrossDayReservation(
      "2026-07-04T22:00:00.000Z",
      "2026-07-05T01:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBe("prev")
  })

  it("returns 'prev' when reservation ends on current date after opening time", () => {
    const result = isCrossDayReservation(
      "2026-07-04T22:00:00.000Z",
      "2026-07-05T14:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBe("prev")
  })

  it("returns null when reservation date is not adjacent (diff !== 1)", () => {
    const result = isCrossDayReservation(
      "2026-07-03T10:00:00.000Z",
      "2026-07-03T11:00:00.000Z",
      "2026-07-05",
      wh,
    )
    expect(result).toBeNull()
  })

  it("returns 'prev' when target day has no working hours", () => {
    const result = isCrossDayReservation(
      "2026-07-04T22:00:00.000Z",
      "2026-07-05T01:00:00.000Z",
      "2026-07-05",
      { mon: { open: "09:00", close: "21:00" } },
    )
    expect(result).toBe("prev")
  })

  it("returns null for 'next' when getDayExtendedBounds returns null", () => {
    const result = isCrossDayReservation(
      "2026-07-06T01:00:00.000Z",
      "2026-07-06T02:00:00.000Z",
      "2026-07-05",
      {},
    )
    expect(result).toBeNull()
  })
})
