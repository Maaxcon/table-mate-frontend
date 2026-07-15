/// <reference types="node" />
import { describe, it, expect, beforeAll } from "vitest"
import { getDayExtendedBounds } from "../scheduler-utils"

beforeAll(() => {
  process.env.TZ = "UTC"
})

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

  it("sets minHour to 0 when prev day closes after midnight", () => {
    const whOvernightPrev = {
      ...wh,
      sat: { open: "18:00", close: "02:00" },
    }
    const result = getDayExtendedBounds("2026-07-05", whOvernightPrev)
    expect(result?.minHour).toBe(0)
    expect(result?.maxHour).toBe(33)
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
