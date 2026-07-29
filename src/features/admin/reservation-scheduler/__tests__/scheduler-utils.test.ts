/// <reference types="node" />
import { beforeAll, describe, expect, it } from "vitest"
import type { SchedulerReservation } from "../types"
import { getReservationBlockMetrics } from "../scheduler-utils"

beforeAll(() => {
  process.env.TZ = "UTC"
})

const baseReservation: SchedulerReservation = {
  public_id: "res-1",
  table: "table-1",
  table_number: "T1",
  customer_name: "Alice",
  guest_count: 4,
  start_at: "2026-07-01T22:00:00.000Z",
  end_at: "2026-07-02T14:00:00.000Z",
  opened_at: null,
  status: "pending",
}

describe("getReservationBlockMetrics", () => {
  it("uses the working-day opening as the visible start for a prev cross-day slice", () => {
    const metrics = getReservationBlockMetrics(baseReservation, 24, 8, "prev")

    expect(metrics.startMinutes).toBe(8 * 60)
    expect(metrics.endMinutes).toBe(14 * 60)
    expect(metrics.dragDurationMinutes).toBe(16 * 60)
    expect(metrics.draggable).toBe(true)
  })

  it("keeps an overnight-only prev slice non-draggable", () => {
    const metrics = getReservationBlockMetrics(
      {
        ...baseReservation,
        end_at: "2026-07-02T02:00:00.000Z",
      },
      24,
      8,
      "prev",
    )

    expect(metrics.startMinutes).toBe(0)
    expect(metrics.endMinutes).toBe(2 * 60)
    expect(metrics.dragDurationMinutes).toBe(4 * 60)
    expect(metrics.draggable).toBe(false)
  })

  it("keeps the next-day spill slice locked", () => {
    const metrics = getReservationBlockMetrics(
      {
        ...baseReservation,
        start_at: "2026-07-06T01:00:00.000Z",
        end_at: "2026-07-06T02:00:00.000Z",
      },
      33,
      8,
      "next",
    )

    expect(metrics.startMinutes).toBe(25 * 60)
    expect(metrics.endMinutes).toBe(26 * 60)
    expect(metrics.dragDurationMinutes).toBe(60)
    expect(metrics.draggable).toBe(false)
  })
})
