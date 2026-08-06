import { useCallback, useReducer } from "react"
import type { ShiftSchedulerShift, EmployeeOnAxis } from "../types"

export interface SchedulerState {
  date: string
  shifts: ShiftSchedulerShift[]
  employeesOnAxis: EmployeeOnAxis[]
  pendingChanges: PendingChange[]
  pendingDeletions: string[]
  saving: boolean
  copySourceDate: string | null
}

export interface PendingChange {
  shiftId: string
  field: "start_time" | "end_time" | "employee" | "date"
  oldValue: string
  newValue: string
}

type Action =
  | { type: "SET_DATE"; date: string }
  | { type: "SET_SHIFTS"; shifts: ShiftSchedulerShift[] }
  | { type: "ADD_EMPLOYEE_TO_AXIS"; employee: EmployeeOnAxis }
  | { type: "REMOVE_EMPLOYEE_FROM_AXIS"; employeeId: string }
  | { type: "CLEAR_EMPLOYEES" }
  | { type: "ADD_SHIFT"; shift: ShiftSchedulerShift }
  | { type: "UPDATE_SHIFT"; shiftId: string; updates: Partial<ShiftSchedulerShift> }
  | { type: "MARK_DELETED"; shiftId: string }
  | { type: "SET_SAVING"; saving: boolean }
  | { type: "COMMIT_CHANGES" }
  | { type: "SET_COPY_SOURCE"; date: string | null }

function reducer(state: SchedulerState, action: Action): SchedulerState {
  switch (action.type) {
    case "SET_DATE":
      return { ...state, date: action.date, shifts: [] }
    case "SET_SHIFTS":
      return { ...state, shifts: action.shifts }
    case "ADD_EMPLOYEE_TO_AXIS": {
      if (state.employeesOnAxis.some((e) => e.public_id === action.employee.public_id)) {
        return state
      }
      return {
        ...state,
        employeesOnAxis: [...state.employeesOnAxis, action.employee],
      }
    }
    case "REMOVE_EMPLOYEE_FROM_AXIS":
      return {
        ...state,
        employeesOnAxis: state.employeesOnAxis.filter((e) => e.public_id !== action.employeeId),
      }
    case "CLEAR_EMPLOYEES":
      return { ...state, employeesOnAxis: [] }
    case "ADD_SHIFT":
      return { ...state, shifts: [...state.shifts, action.shift] }
    case "UPDATE_SHIFT":
      return {
        ...state,
        shifts: state.shifts.map((s) =>
          s.public_id === action.shiftId ? { ...s, ...action.updates } : s,
        ),
      }
    case "MARK_DELETED":
      return {
        ...state,
        shifts: state.shifts.filter((s) => s.public_id !== action.shiftId),
      }
    case "SET_SAVING":
      return { ...state, saving: action.saving }
    case "COMMIT_CHANGES":
      return { ...state, pendingChanges: [], pendingDeletions: [] }
    case "SET_COPY_SOURCE":
      return { ...state, copySourceDate: action.date }
    default:
      return state
  }
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const initialState: SchedulerState = {
  date: formatDateKey(new Date()),
  shifts: [],
  employeesOnAxis: [],
  pendingChanges: [],
  pendingDeletions: [],
  saving: false,
  copySourceDate: null,
}

export function useShiftSchedulerState() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setDate = useCallback((date: string) => dispatch({ type: "SET_DATE", date }), [])
  const setShifts = useCallback(
    (shifts: ShiftSchedulerShift[]) => dispatch({ type: "SET_SHIFTS", shifts }),
    [],
  )
  const addEmployeeToAxis = useCallback(
    (employee: EmployeeOnAxis) => dispatch({ type: "ADD_EMPLOYEE_TO_AXIS", employee }),
    [],
  )
  const removeEmployeeFromAxis = useCallback(
    (employeeId: string) => dispatch({ type: "REMOVE_EMPLOYEE_FROM_AXIS", employeeId }),
    [],
  )
  const clearEmployees = useCallback(() => dispatch({ type: "CLEAR_EMPLOYEES" }), [])
  const addShift = useCallback(
    (shift: ShiftSchedulerShift) => dispatch({ type: "ADD_SHIFT", shift }),
    [],
  )
  const updateShift = useCallback(
    (shiftId: string, updates: Partial<ShiftSchedulerShift>) =>
      dispatch({ type: "UPDATE_SHIFT", shiftId, updates }),
    [],
  )
  const markDeleted = useCallback(
    (shiftId: string) => dispatch({ type: "MARK_DELETED", shiftId }),
    [],
  )
  const setSaving = useCallback((saving: boolean) => dispatch({ type: "SET_SAVING", saving }), [])
  const commitChanges = useCallback(() => dispatch({ type: "COMMIT_CHANGES" }), [])
  const setCopySource = useCallback(
    (date: string | null) => dispatch({ type: "SET_COPY_SOURCE", date }),
    [],
  )

  return {
    state,
    setDate,
    setShifts,
    addEmployeeToAxis,
    removeEmployeeFromAxis,
    clearEmployees,
    addShift,
    updateShift,
    markDeleted,
    setSaving,
    commitChanges,
    setCopySource,
  }
}
