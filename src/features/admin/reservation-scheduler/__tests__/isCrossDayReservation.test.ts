/// <reference types="node" />
import { describe, it, expect, beforeAll } from "vitest"
import { isCrossDayReservation } from "../scheduler-utils"

beforeAll(() => {
  process.env.TZ = "UTC"
})

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
