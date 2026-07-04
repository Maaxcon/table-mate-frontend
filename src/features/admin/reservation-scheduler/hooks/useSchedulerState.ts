import { useCallback, useReducer } from "react"
import type { PendingChange, SchedulerReservation } from "../types"
import { isoToDateKey } from "../types"

export interface SchedulerState {
  dates: string[]
  reservations: SchedulerReservation[]
  pendingChanges: PendingChange[]
  conflictReservationId: string | null
  saving: boolean
}

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
      crossMidnight?: boolean
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

function toHHMM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function localToISOString(dateStr: string, timeHHMM: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [h, min] = timeHHMM.split(":").map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString()
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
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
      end_at: change.new_end_date
        ? localToISOString(change.new_end_date, change.new_end_time)
        : localToISOString(change.new_date, change.new_end_time),
    }
  })
}

function reducer(state: SchedulerState, action: Action): SchedulerState {
  switch (action.type) {
    case "SET_DATES":
      return { ...state, dates: action.dates }
    case "SET_RESERVATIONS": {
      const serverIds = new Set(action.reservations.map((r) => r.public_id))
      const injected = [...action.reservations]
      for (const change of state.pendingChanges) {
        if (!serverIds.has(change.reservation_id)) {
          injected.push({
            public_id: change.reservation_id,
            table: change.new_table_id,
            table_number: change.new_table_number,
            customer_name: change.customer_name,
            guest_count: change.guest_count,
            start_at: localToISOString(change.new_date, change.new_start_time),
            end_at: change.new_end_date
              ? localToISOString(change.new_end_date, change.new_end_time)
              : localToISOString(change.new_date, change.new_end_time),
            opened_at: change.opened_at,
            status: change.status as SchedulerReservation["status"],
          })
        }
      }
      let updated = injected
      for (const change of state.pendingChanges) {
        updated = applyChange(updated, change)
      }
      return { ...state, reservations: updated }
    }
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
        new_end_date: action.crossMidnight ? addDay(action.newDate) : undefined,
        customer_name: existingChange?.customer_name ?? existing.customer_name,
        guest_count: existingChange?.guest_count ?? existing.guest_count,
        opened_at: existingChange?.opened_at ?? existing.opened_at,
        status: existingChange?.status ?? existing.status,
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
      let newEndDate: string | undefined

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
        if (h < oldStart.getHours() || (h === oldStart.getHours() && m < oldStart.getMinutes())) {
          newEnd = new Date(
            oldEnd.getFullYear(),
            oldEnd.getMonth(),
            oldEnd.getDate() + 1,
            h,
            m,
            0,
            0,
          )
          newEndDate = addDay(isoToDateKey(oldStart.toISOString()))
        } else {
          newEnd = new Date(oldEnd.getFullYear(), oldEnd.getMonth(), oldEnd.getDate(), h, m, 0, 0)
        }
        if (newEnd <= oldStart) return state
      }

      const dateKey = isoToDateKey(newStart.toISOString())
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
        new_end_date: newEndDate,
        customer_name: existingChange?.customer_name ?? target.customer_name,
        guest_count: existingChange?.guest_count ?? target.guest_count,
        opened_at: existingChange?.opened_at ?? target.opened_at,
        status: existingChange?.status ?? target.status,
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

const initialState: SchedulerState = {
  dates: [],
  reservations: [],
  pendingChanges: [],
  conflictReservationId: null,
  saving: false,
}

export function useSchedulerState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setDates = useCallback((dates: string[]) => dispatch({ type: "SET_DATES", dates }), [])
  const setReservations = useCallback(
    (reservations: SchedulerReservation[]) => dispatch({ type: "SET_RESERVATIONS", reservations }),
    [],
  )
  const moveReservation = useCallback(
    (
      reservationId: string,
      newTableId: string,
      newTableNumber: string,
      newDate: string,
      newStartTime: string,
      newEndTime: string,
      crossMidnight?: boolean,
    ) =>
      dispatch({
        type: "MOVE_RESERVATION",
        reservationId,
        newTableId,
        newTableNumber,
        newDate,
        newStartTime,
        newEndTime,
        crossMidnight,
      }),
    [],
  )
  const resizeReservation = useCallback(
    (reservationId: string, edge: "start" | "end", newTime: string) =>
      dispatch({ type: "RESIZE_RESERVATION", reservationId, edge, newTime }),
    [],
  )
  const resetChanges = useCallback(() => dispatch({ type: "RESET_CHANGES" }), [])
  const clearPending = useCallback(() => dispatch({ type: "CLEAR_PENDING" }), [])
  const markConflict = useCallback(
    (reservationId: string) => dispatch({ type: "MARK_CONFLICT", reservationId }),
    [],
  )
  const clearConflict = useCallback(() => dispatch({ type: "CLEAR_CONFLICT" }), [])
  const setSaving = useCallback((saving: boolean) => dispatch({ type: "SET_SAVING", saving }), [])
  const commitChanges = useCallback(() => dispatch({ type: "COMMIT_CHANGES" }), [])

  return {
    state,
    setDates,
    setReservations,
    moveReservation,
    resizeReservation,
    resetChanges,
    clearPending,
    markConflict,
    clearConflict,
    setSaving,
    commitChanges,
  }
}
