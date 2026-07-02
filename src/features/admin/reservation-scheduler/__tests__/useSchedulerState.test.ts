import { describe, it, expect, beforeAll } from "vitest"

beforeAll(() => {
  process.env.TZ = "UTC"
})
import type { SchedulerReservation, PendingChange } from "../types"

type Action =
  | { type: "SET_DATES"; dates: string[] }
  | { type: "SET_RESERVATIONS"; reservations: SchedulerReservation[] }
  | {
      type: "MOVE_RESERVATION"
      reservationId: string
      newTableId: string
      newTableNumber: string
      newDate: string
      newStartTime: string
      newEndTime: string
    }
  | {
      type: "RESIZE_RESERVATION"
      reservationId: string
      edge: "start" | "end"
      newTime: string
    }
  | { type: "RESET_CHANGES" }
  | { type: "CLEAR_PENDING" }
  | { type: "MARK_CONFLICT"; reservationId: string }
  | { type: "CLEAR_CONFLICT" }
  | { type: "SET_SAVING"; saving: boolean }
  | { type: "COMMIT_CHANGES" }

interface SchedulerState {
  dates: string[]
  reservations: SchedulerReservation[]
  pendingChanges: PendingChange[]
  conflictReservationId: string | null
  saving: boolean
}

function toHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function localToISOString(dateStr: string, timeHHMM: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [h, min] = timeHHMM.split(":").map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString()
}

function applyChange(
  reservations: SchedulerReservation[],
  change: PendingChange,
): SchedulerReservation[] {
  return reservations.map((r) => {
    if (r.public_id !== change.reservation_id) return r
    return {
      ...r,
      table: change.new_table_id,
      table_number: change.new_table_number,
      start_at: localToISOString(change.new_date, change.new_start_time),
      end_at: localToISOString(change.new_date, change.new_end_time),
    }
  })
}

function reducer(state: SchedulerState, action: Action): SchedulerState {
  switch (action.type) {
    case "SET_DATES":
      return { ...state, dates: action.dates }
    case "SET_RESERVATIONS":
      return { ...state, reservations: action.reservations }
    case "MOVE_RESERVATION": {
      const existing = state.reservations.find((r) => r.public_id === action.reservationId)
      if (!existing) return state

      const existingChange = state.pendingChanges.find(
        (c) => c.reservation_id === action.reservationId,
      )

      const change: PendingChange = {
        reservation_id: action.reservationId,
        original_table: existingChange?.original_table ?? existing.table,
        original_table_number: existingChange?.original_table_number ?? existing.table_number,
        original_start_at: existingChange?.original_start_at ?? existing.start_at,
        original_end_at: existingChange?.original_end_at ?? existing.end_at,
        new_table_id: action.newTableId,
        new_table_number: action.newTableNumber,
        new_date: action.newDate,
        new_start_time: action.newStartTime,
        new_end_time: action.newEndTime,
      }

      const otherChanges = state.pendingChanges.filter(
        (c) => c.reservation_id !== action.reservationId,
      )
      const newChanges = [...otherChanges, change]

      const baseReservations = state.reservations.map((r) => {
        const prevChange = state.pendingChanges.find((c) => c.reservation_id === r.public_id)
        if (prevChange) {
          return {
            ...r,
            table: prevChange.original_table,
            table_number: prevChange.original_table_number,
            start_at: prevChange.original_start_at,
            end_at: prevChange.original_end_at,
          }
        }
        return r
      })

      let updated = baseReservations
      for (const c of newChanges) {
        updated = applyChange(updated, c)
      }

      return { ...state, reservations: updated, pendingChanges: newChanges }
    }
    case "RESIZE_RESERVATION": {
      const target = state.reservations.find((r) => r.public_id === action.reservationId)
      if (!target) return state

      const oldStart = new Date(target.start_at)
      const oldEnd = new Date(target.end_at)
      const [h, m] = action.newTime.split(":").map(Number)

      let newStart: Date
      let newEnd: Date

      if (action.edge === "start") {
        newStart = new Date(
          oldStart.getFullYear(),
          oldStart.getMonth(),
          oldStart.getDate(),
          h,
          m,
          0,
          0,
        )
        newEnd = oldEnd
        if (newStart >= oldEnd) return state
      } else {
        newStart = oldStart
        newEnd = new Date(oldEnd.getFullYear(), oldEnd.getMonth(), oldEnd.getDate(), h, m, 0, 0)
        if (newEnd <= oldStart) return state
      }

      const dateKey = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, "0")}-${String(newStart.getDate()).padStart(2, "0")}`
      const startHHMM = toHHMM(newStart.toISOString())
      const endHHMM = toHHMM(newEnd.toISOString())

      const existingChange = state.pendingChanges.find(
        (c) => c.reservation_id === action.reservationId,
      )

      const change: PendingChange = {
        reservation_id: action.reservationId,
        original_table: existingChange?.original_table ?? target.table,
        original_table_number: existingChange?.original_table_number ?? target.table_number,
        original_start_at: existingChange?.original_start_at ?? target.start_at,
        original_end_at: existingChange?.original_end_at ?? target.end_at,
        new_table_id: target.table,
        new_table_number: target.table_number,
        new_date: dateKey,
        new_start_time: startHHMM,
        new_end_time: endHHMM,
      }

      const otherChanges = state.pendingChanges.filter(
        (c) => c.reservation_id !== action.reservationId,
      )
      const newChanges = [...otherChanges, change]

      const baseReservations = state.reservations.map((r) => {
        const prevChange = state.pendingChanges.find((c) => c.reservation_id === r.public_id)
        if (prevChange) {
          return {
            ...r,
            table: prevChange.original_table,
            table_number: prevChange.original_table_number,
            start_at: prevChange.original_start_at,
            end_at: prevChange.original_end_at,
          }
        }
        return r
      })

      let updated = baseReservations
      for (const c of newChanges) {
        updated = applyChange(updated, c)
      }

      return { ...state, reservations: updated, pendingChanges: newChanges }
    }
    case "RESET_CHANGES": {
      const restored = state.reservations.map((r) => {
        const change = state.pendingChanges.find((c) => c.reservation_id === r.public_id)
        if (change) {
          return {
            ...r,
            table: change.original_table,
            table_number: change.original_table_number,
            start_at: change.original_start_at,
            end_at: change.original_end_at,
          }
        }
        return r
      })
      return { ...state, reservations: restored, pendingChanges: [], conflictReservationId: null }
    }
    case "CLEAR_PENDING":
      return { ...state, pendingChanges: [], conflictReservationId: null }
    case "MARK_CONFLICT":
      return { ...state, conflictReservationId: action.reservationId }
    case "CLEAR_CONFLICT":
      return { ...state, conflictReservationId: null }
    case "SET_SAVING":
      return { ...state, saving: action.saving }
    case "COMMIT_CHANGES":
      return { ...state, pendingChanges: [], conflictReservationId: null }
    default:
      return state
  }
}

const baseReservation: SchedulerReservation = {
  public_id: "res-1",
  table: "table-1",
  table_number: "T1",
  customer_name: "Alice",
  guest_count: 4,
  start_at: "2026-07-02T18:00:00.000Z",
  end_at: "2026-07-02T20:00:00.000Z",
  opened_at: null,
  status: "pending",
}

const baseState: SchedulerState = {
  dates: ["2026-07-02"],
  reservations: [baseReservation],
  pendingChanges: [],
  conflictReservationId: null,
  saving: false,
}

describe("scheduler reducer", () => {
  it("SET_DATES updates dates", () => {
    const next = reducer(baseState, { type: "SET_DATES", dates: ["2026-07-03"] })
    expect(next.dates).toEqual(["2026-07-03"])
  })

  it("SET_RESERVATIONS replaces reservations", () => {
    const r2 = { ...baseReservation, public_id: "res-2" }
    const next = reducer(baseState, { type: "SET_RESERVATIONS", reservations: [r2] })
    expect(next.reservations).toEqual([r2])
  })

  it("MOVE_RESERVATION adds a pending change and updates the reservation", () => {
    const next = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    expect(next.pendingChanges).toHaveLength(1)
    expect(next.pendingChanges[0].new_table_id).toBe("table-2")
    expect(next.pendingChanges[0].new_start_time).toBe("19:00")
    expect(next.pendingChanges[0].original_table).toBe("table-1")
    const updated = next.reservations.find((r) => r.public_id === "res-1")
    expect(updated?.table).toBe("table-2")
  })

  it("MOVE_RESERVATION is a no-op for unknown id", () => {
    const next = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "unknown",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    expect(next.pendingChanges).toHaveLength(0)
  })

  it("RESIZE_RESERVATION adds a pending change for end edge", () => {
    const next = reducer(baseState, {
      type: "RESIZE_RESERVATION",
      reservationId: "res-1",
      edge: "end",
      newTime: "21:00",
    })
    expect(next.pendingChanges).toHaveLength(1)
    expect(next.pendingChanges[0].reservation_id).toBe("res-1")
    expect(next.pendingChanges[0].original_end_at).toBe("2026-07-02T20:00:00.000Z")
    expect(next.pendingChanges[0].new_end_time).toBe("21:00")
    expect(next.pendingChanges[0].original_table).toBe("table-1")
  })

  it("RESIZE_RESERVATION preserves original table and number", () => {
    const next = reducer(baseState, {
      type: "RESIZE_RESERVATION",
      reservationId: "res-1",
      edge: "start",
      newTime: "06:00",
    })
    expect(next.pendingChanges).toHaveLength(1)
    expect(next.pendingChanges[0].new_table_id).toBe("table-1")
    expect(next.pendingChanges[0].new_table_number).toBe("T1")
  })

  it("RESET_CHANGES reverts reservations to originals", () => {
    const moved = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    const reset = reducer(moved, { type: "RESET_CHANGES" })
    expect(reset.pendingChanges).toHaveLength(0)
    const restored = reset.reservations.find((r) => r.public_id === "res-1")
    expect(restored?.table).toBe("table-1")
    expect(restored?.table_number).toBe("T1")
  })

  it("CLEAR_PENDING clears pending changes without reverting", () => {
    const moved = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    const cleared = reducer(moved, { type: "CLEAR_PENDING" })
    expect(cleared.pendingChanges).toHaveLength(0)
    const stillMoved = cleared.reservations.find((r) => r.public_id === "res-1")
    expect(stillMoved?.table).toBe("table-2")
  })

  it("MARK_CONFLICT sets conflictReservationId", () => {
    const next = reducer(baseState, { type: "MARK_CONFLICT", reservationId: "res-1" })
    expect(next.conflictReservationId).toBe("res-1")
  })

  it("CLEAR_CONFLICT clears conflictReservationId", () => {
    const marked = reducer(baseState, { type: "MARK_CONFLICT", reservationId: "res-1" })
    const cleared = reducer(marked, { type: "CLEAR_CONFLICT" })
    expect(cleared.conflictReservationId).toBeNull()
  })

  it("SET_SAVING updates saving flag", () => {
    const next = reducer(baseState, { type: "SET_SAVING", saving: true })
    expect(next.saving).toBe(true)
  })

  it("COMMIT_CHANGES clears pending changes", () => {
    const moved = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    const committed = reducer(moved, { type: "COMMIT_CHANGES" })
    expect(committed.pendingChanges).toHaveLength(0)
    expect(committed.conflictReservationId).toBeNull()
  })

  it("MOVE_RESERVATION preserves original values across multiple changes", () => {
    const first = reducer(baseState, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-2",
      newTableNumber: "T2",
      newDate: "2026-07-02",
      newStartTime: "19:00",
      newEndTime: "21:00",
    })
    const second = reducer(first, {
      type: "MOVE_RESERVATION",
      reservationId: "res-1",
      newTableId: "table-3",
      newTableNumber: "T3",
      newDate: "2026-07-02",
      newStartTime: "20:00",
      newEndTime: "22:00",
    })
    expect(second.pendingChanges).toHaveLength(1)
    expect(second.pendingChanges[0].original_table).toBe("table-1")
    expect(second.pendingChanges[0].new_table_id).toBe("table-3")
  })
})
