import { describe, expect, it } from "vitest"
import type { FloorTable, UpcomingReservation } from "./types"
import { getTableVisualStatus } from "./types"

function makeTable(overrides: Partial<FloorTable> = {}): FloorTable {
  return {
    public_id: "table-1",
    public_number: "T1",
    capacity: 4,
    is_occupied: false,
    active: true,
    shape: "square",
    position_x: 0,
    position_y: 0,
    ...overrides,
  }
}

describe("getTableVisualStatus", () => {
  it("flips to reserved for a live reservation whose start has already passed, given end_at", () => {
    const now = new Date("2026-07-08T12:00:00.000Z")
    const reservation: UpcomingReservation = {
      public_id: "r1",
      table_id: "table-1",
      start_at: "2026-07-08T11:30:00.000Z",
      end_at: "2026-07-08T13:30:00.000Z",
    }

    expect(getTableVisualStatus(makeTable(), [reservation], now)).toBe("reserved")
  })

  it("stays free for the same live reservation when end_at is missing", () => {
    // This is exactly what HALL_NEW_RESERVATION handling used to produce:
    // the backend sends end_at, but the FE event type (and the handler that
    // pushes into upcomingReservations) dropped it — a reservation created
    // for right now (start <= now) could never flip its tile to "reserved"
    // over the live WebSocket path, only after a full reload picked it up
    // from the REST endpoint (which does include end_at).
    const now = new Date("2026-07-08T12:00:00.000Z")
    const reservation: UpcomingReservation = {
      public_id: "r1",
      table_id: "table-1",
      start_at: "2026-07-08T11:30:00.000Z",
      // end_at intentionally omitted
    }

    expect(getTableVisualStatus(makeTable(), [reservation], now)).toBe("free")
  })

  it("flips to reserved for a reservation starting within the next 15 minutes, even without end_at", () => {
    const now = new Date("2026-07-08T12:00:00.000Z")
    const reservation: UpcomingReservation = {
      public_id: "r1",
      table_id: "table-1",
      start_at: "2026-07-08T12:10:00.000Z",
    }

    expect(getTableVisualStatus(makeTable(), [reservation], now)).toBe("reserved")
  })
})
