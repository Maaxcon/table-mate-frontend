/* eslint-disable react-hooks/set-state-in-effect, jsx-a11y/no-noninteractive-element-interactions */
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuChevronLeft, LuChevronRight, LuPlus, LuCopy, LuCheck, LuX } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
import { useEmployees } from "@/features/admin/hooks/useEmployees"
import { useShiftSchedulerState } from "./hooks/useShiftSchedulerState"
import { fetchShifts, createShift, deleteShift, copyShifts, fetchWorkingHours } from "./api"
import type { ShiftSchedulerShift, EmployeeOnAxis } from "./types"
import "./ShiftScheduler.css"

const EMPLOYEE_ROW_HEIGHT = 80
const HOUR_WIDTH = 80
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function getDayHourRange(
  date: string,
  workingHours: Record<string, { open: string; close: string }> | null,
): { firstHour: number; lastHour: number; openMinutes: number; closeMinutes: number } {
  if (!workingHours) return { firstHour: 6, lastHour: 22, openMinutes: 360, closeMinutes: 1320 }
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return { firstHour: 6, lastHour: 22, openMinutes: 360, closeMinutes: 1320 }

  const openMin = timeToMinutes(dayHours.open)
  const closeMin = timeToMinutes(dayHours.close)
  if (openMin == null || closeMin == null || closeMin <= openMin) {
    return { firstHour: 6, lastHour: 22, openMinutes: 360, closeMinutes: 1320 }
  }

  return {
    firstHour: Math.floor(openMin / 60),
    lastHour: Math.ceil(closeMin / 60),
    openMinutes: openMin,
    closeMinutes: closeMin,
  }
}

function ShiftScheduler() {
  const restaurantId = useAppSelector((s) => s.auth.user?.restaurantId)
  const toast = useToast()
  const adminStrings = useAdminStrings()
  const strings = adminStrings.shiftScheduler
  const { employees, loading: employeesLoading } = useEmployees()

  const {
    state,
    setDate,
    setShifts,
    addEmployeeToAxis,
    removeEmployeeFromAxis,
    clearEmployees,
    addShift,
    markDeleted,
    setCopySource,
  } = useShiftSchedulerState()

  const [dataLoading, setDataLoading] = useState(true)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [creatingShiftFor, setCreatingShiftFor] = useState<string | null>(null)
  const [newShiftStart, setNewShiftStart] = useState("09:00")
  const [newShiftEnd, setNewShiftEnd] = useState("18:00")
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  const [copyTargetDates, setCopyTargetDates] = useState<string[]>([])
  const [copyDateInput, setCopyDateInput] = useState("")
  const [workingHours, setWorkingHours] = useState<Record<
    string,
    { open: string; close: string }
  > | null>(null)

  const currentDate = useMemo(() => new Date(state.date + "T00:00:00"), [state.date])

  const dayHourRange = useMemo(
    () => getDayHourRange(state.date, workingHours),
    [state.date, workingHours],
  )

  const HOURS = useMemo(() => {
    const hours: number[] = []
    for (let h = dayHourRange.firstHour; h < dayHourRange.lastHour; h++) {
      hours.push(h)
    }
    return hours
  }, [dayHourRange])

  useEffect(() => {
    if (!restaurantId) return
    fetchWorkingHours(restaurantId)
      .then(setWorkingHours)
      .catch(() => {})
  }, [restaurantId])

  const navigateDay = useCallback(
    (direction: number) => {
      const newDate = addDays(currentDate, direction)
      setDate(formatDateKey(newDate))
    },
    [currentDate, setDate],
  )

  const goToday = useCallback(() => {
    setDate(formatDateKey(new Date()))
  }, [setDate])

  useEffect(() => {
    if (!restaurantId) return
    let cancelled = false
    setDataLoading(true)
    fetchShifts({ date: state.date })
      .then((data) => {
        if (!cancelled) setShifts(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId, state.date, setShifts])

  const availableEmployees = useMemo(
    () => employees.filter((e) => !state.employeesOnAxis.some((a) => a.public_id === e.public_id)),
    [employees, state.employeesOnAxis],
  )

  const handleAddEmployee = useCallback(
    (employee: EmployeeOnAxis) => {
      addEmployeeToAxis(employee)
      setShowEmployeePicker(false)
    },
    [addEmployeeToAxis],
  )

  const handleClickSlot = useCallback((employeeId: string, hour: number) => {
    setCreatingShiftFor(employeeId)
    setNewShiftStart(`${String(hour).padStart(2, "0")}:00`)
    setNewShiftEnd(`${String(hour + 1).padStart(2, "0")}:00`)
  }, [])

  const handleConfirmCreateShift = useCallback(async () => {
    if (!creatingShiftFor || !restaurantId) return
    try {
      const shift = await createShift({
        employee: creatingShiftFor,
        date: state.date,
        start_time: newShiftStart,
        end_time: newShiftEnd,
        notes: "",
      })
      addShift(shift)
      setCreatingShiftFor(null)
      toast.success(strings.toasts.created)
    } catch {
      toast.error(strings.toasts.saveFailed)
    }
  }, [
    creatingShiftFor,
    restaurantId,
    state.date,
    newShiftStart,
    newShiftEnd,
    addShift,
    toast,
    strings,
  ])

  const handleDeleteShift = useCallback(
    async (shiftId: string) => {
      try {
        await deleteShift(shiftId)
        markDeleted(shiftId)
        toast.success(strings.toasts.deleted)
      } catch {
        toast.error(strings.toasts.saveFailed)
      }
    },
    [markDeleted, toast, strings],
  )

  const handleCopy = useCallback(() => {
    setCopySource(state.date)
    setShowCopyPicker(true)
  }, [state.date, setCopySource])

  const handleAddCopyDate = useCallback(() => {
    if (copyDateInput) {
      setCopyTargetDates((prev) => [...prev, copyDateInput])
      setCopyDateInput("")
    }
  }, [copyDateInput])

  const handleConfirmCopy = useCallback(async () => {
    if (!state.copySourceDate || copyTargetDates.length === 0) return
    try {
      const result = await copyShifts({
        source_date: state.copySourceDate,
        target_dates: copyTargetDates,
      })
      toast.success(strings.copyPaste.success(result.copied))
      setShowCopyPicker(false)
      setCopyTargetDates([])
      setCopySource(null)
      const shifts = await fetchShifts({ date: state.date })
      setShifts(shifts)
    } catch {
      toast.error(strings.copyPaste.conflict)
    }
  }, [state.copySourceDate, copyTargetDates, setCopySource, setShifts, state.date, toast, strings])

  const shiftsByEmployee = useMemo(() => {
    const map: Record<string, ShiftSchedulerShift[]> = {}
    for (const s of state.shifts) {
      if (!map[s.employee]) map[s.employee] = []
      map[s.employee].push(s)
    }
    return map
  }, [state.shifts])

  if (!restaurantId) {
    return <div className="shift-scheduler">{strings.grid.noRestaurant}</div>
  }

  return (
    <div className="shift-scheduler">
      {/* Toolbar */}
      <div className="shift-scheduler__toolbar">
        <div className="shift-scheduler__nav">
          <button
            onClick={() => navigateDay(-1)}
            className="shift-scheduler__nav-btn"
            aria-label={strings.toolbar.prev}
          >
            <LuChevronLeft />
          </button>
          <span className="shift-scheduler__date-label">
            {currentDate.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <button
            onClick={() => navigateDay(1)}
            className="shift-scheduler__nav-btn"
            aria-label={strings.toolbar.next}
          >
            <LuChevronRight />
          </button>
          <button onClick={goToday} className="shift-scheduler__today-btn">
            {strings.toolbar.today}
          </button>
        </div>

        <div className="shift-scheduler__actions">
          <button
            onClick={() => setShowEmployeePicker(true)}
            className="shift-scheduler__action-btn"
          >
            <LuPlus /> {strings.toolbar.addEmployee}
          </button>
          <button onClick={handleCopy} className="shift-scheduler__action-btn">
            <LuCopy /> {strings.toolbar.copy}
          </button>
          {state.employeesOnAxis.length > 0 && (
            <button
              onClick={clearEmployees}
              className="shift-scheduler__action-btn shift-scheduler__action-btn--danger"
            >
              <LuX /> {strings.toolbar.clearEmployees}
            </button>
          )}
        </div>
      </div>

      {/* Employee Picker Modal */}
      {showEmployeePicker && (
        <div className="shift-scheduler__overlay" role="presentation">
          <div
            className="shift-scheduler__modal"
            role="dialog"
            aria-modal="true"
            aria-label={strings.toolbar.addEmployee}
          >
            <h3>{strings.toolbar.addEmployee}</h3>
            {employeesLoading && <p>Loading...</p>}
            {!employeesLoading && availableEmployees.length === 0 && (
              <p>All employees are already on the board.</p>
            )}
            <div className="shift-scheduler__employee-list">
              {availableEmployees.map((e) => (
                <button
                  key={e.public_id}
                  className="shift-scheduler__employee-option"
                  onClick={() =>
                    handleAddEmployee({
                      public_id: e.public_id,
                      name:
                        e.first_name && e.last_name ? `${e.first_name} ${e.last_name}` : e.email,
                      role: e.role ?? "",
                    })
                  }
                >
                  <span className="shift-scheduler__employee-name">
                    {e.first_name && e.last_name ? `${e.first_name} ${e.last_name}` : e.email}
                  </span>
                  <span className="shift-scheduler__employee-role">{e.role}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEmployeePicker(false)}
              className="shift-scheduler__modal-close"
            >
              {adminStrings.common.close}
            </button>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {creatingShiftFor && (
        <div
          className="shift-scheduler__overlay"
          role="dialog"
          aria-modal="true"
          aria-label={strings.shift.add}
          onKeyDown={(e) => e.key === "Escape" && setCreatingShiftFor(null)}
        >
          <div className="shift-scheduler__modal">
            <h3>{strings.shift.add}</h3>
            <div className="shift-scheduler__form-row">
              <label>{strings.shift.startTime}</label>
              <input
                type="time"
                value={newShiftStart}
                onChange={(e) => setNewShiftStart(e.target.value)}
                className="shift-scheduler__time-input"
              />
            </div>
            <div className="shift-scheduler__form-row">
              <label>{strings.shift.endTime}</label>
              <input
                type="time"
                value={newShiftEnd}
                onChange={(e) => setNewShiftEnd(e.target.value)}
                className="shift-scheduler__time-input"
              />
            </div>
            {workingHours &&
              (() => {
                const dayKey = DAY_KEYS[currentDate.getDay()]
                const dayHours = workingHours[dayKey]
                if (dayHours) {
                  const startMin = timeToMinutes(newShiftStart)
                  const endMin = timeToMinutes(newShiftEnd)
                  const openMin = timeToMinutes(dayHours.open)
                  const closeMin = timeToMinutes(dayHours.close)
                  const tooEarly = startMin < openMin
                  const tooLate = endMin > closeMin
                  if (tooEarly || tooLate) {
                    return (
                      <p className="shift-scheduler__wh-error">
                        Shift must be within working hours ({dayHours.open}–{dayHours.close})
                      </p>
                    )
                  }
                }
                return null
              })()}
            <div className="shift-scheduler__form-actions">
              <button
                onClick={handleConfirmCreateShift}
                className="shift-scheduler__action-btn"
                disabled={(() => {
                  if (!workingHours) return false
                  const dayKey = DAY_KEYS[currentDate.getDay()]
                  const dayHours = workingHours[dayKey]
                  if (!dayHours) return false
                  const startMin = timeToMinutes(newShiftStart)
                  const endMin = timeToMinutes(newShiftEnd)
                  const openMin = timeToMinutes(dayHours.open)
                  const closeMin = timeToMinutes(dayHours.close)
                  return startMin < openMin || endMin > closeMin
                })()}
              >
                {strings.shift.add}
              </button>
              <button
                onClick={() => setCreatingShiftFor(null)}
                className="shift-scheduler__action-btn shift-scheduler__action-btn--secondary"
              >
                {adminStrings.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Picker Modal */}
      {showCopyPicker && (
        <div
          className="shift-scheduler__overlay"
          role="dialog"
          aria-modal="true"
          aria-label={strings.toolbar.copy}
          onKeyDown={(e) => e.key === "Escape" && setShowCopyPicker(false)}
        >
          <div className="shift-scheduler__modal">
            <h3>{strings.copyPaste.sourceLabel(state.copySourceDate ?? "")}</h3>
            <p>{strings.toolbar.selectTarget}</p>
            <div className="shift-scheduler__form-row">
              <input
                type="date"
                value={copyDateInput}
                onChange={(e) => setCopyDateInput(e.target.value)}
                className="shift-scheduler__date-input"
              />
              <button onClick={handleAddCopyDate} className="shift-scheduler__action-btn">
                <LuPlus />
              </button>
            </div>
            {copyTargetDates.length > 0 && (
              <div className="shift-scheduler__copy-targets">
                {copyTargetDates.map((d) => (
                  <span key={d} className="shift-scheduler__copy-chip">
                    {d}
                    <button
                      onClick={() => setCopyTargetDates((prev) => prev.filter((x) => x !== d))}
                    >
                      <LuX />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="shift-scheduler__form-actions">
              <button
                onClick={handleConfirmCopy}
                disabled={copyTargetDates.length === 0}
                className="shift-scheduler__action-btn"
              >
                <LuCheck /> {strings.copyPaste.confirm(copyTargetDates.length)}
              </button>
              <button
                onClick={() => {
                  setShowCopyPicker(false)
                  setCopyTargetDates([])
                  setCopySource(null)
                }}
                className="shift-scheduler__action-btn shift-scheduler__action-btn--secondary"
              >
                {adminStrings.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="shift-scheduler__body">
        {state.employeesOnAxis.length === 0 ? (
          <div className="shift-scheduler__empty">
            <p>{strings.grid.emptyEmployees}</p>
            <button
              onClick={() => setShowEmployeePicker(true)}
              className="shift-scheduler__action-btn"
            >
              <LuPlus /> {strings.toolbar.addEmployee}
            </button>
          </div>
        ) : dataLoading ? (
          <div className="shift-scheduler__empty">{adminStrings.common.loading}</div>
        ) : (
          <div className="shift-scheduler__grid-wrapper">
            <div className="shift-scheduler__grid">
              {/* Timeline Header */}
              <div className="shift-scheduler__timeline">
                <div className="shift-scheduler__gutter" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="shift-scheduler__hour-header"
                    style={{ width: HOUR_WIDTH }}
                  >
                    {strings.grid.hour(h)}
                  </div>
                ))}
              </div>

              {/* Employee Rows */}
              {state.employeesOnAxis.map((employee) => {
                const employeeShifts = shiftsByEmployee[employee.public_id] ?? []
                return (
                  <div
                    key={employee.public_id}
                    className="shift-scheduler__row"
                    style={{ height: EMPLOYEE_ROW_HEIGHT }}
                  >
                    <div className="shift-scheduler__gutter">
                      <span className="shift-scheduler__employee-label">{employee.name}</span>
                      <span className="shift-scheduler__employee-role-label">{employee.role}</span>
                      <button
                        onClick={() => removeEmployeeFromAxis(employee.public_id)}
                        className="shift-scheduler__remove-btn"
                        title={strings.toolbar.removeEmployee}
                      >
                        <LuX size={14} />
                      </button>
                    </div>
                    <div className="shift-scheduler__row-slots">
                      <div className="shift-scheduler__hour-grid">
                        {HOURS.map((h) => {
                          const slotStart = h * 60
                          const slotEnd = (h + 1) * 60
                          const hasShift = employeeShifts.some((s) => {
                            const sStart = timeToMinutes(s.start_time)
                            const sEnd = timeToMinutes(s.end_time)
                            return sStart < slotEnd && sEnd > slotStart
                          })
                          return (
                            <div
                              key={h}
                              role="button"
                              tabIndex={0}
                              className="shift-scheduler__slot"
                              style={{ width: HOUR_WIDTH }}
                              onClick={() => !hasShift && handleClickSlot(employee.public_id, h)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !hasShift) {
                                  handleClickSlot(employee.public_id, h)
                                }
                              }}
                            />
                          )
                        })}
                      </div>
                      <div className="shift-scheduler__shifts-layer">
                        {employeeShifts.map((shift) => {
                          const startMin = timeToMinutes(shift.start_time)
                          const endMin = timeToMinutes(shift.end_time)
                          const left = ((startMin - dayHourRange.openMinutes) / 60) * HOUR_WIDTH
                          const width = ((endMin - startMin) / 60) * HOUR_WIDTH
                          return (
                            <div
                              key={shift.public_id}
                              className="shift-scheduler__shift-block"
                              style={{
                                left: `${left}px`,
                                width: `${width}px`,
                                top: "4px",
                                height: EMPLOYEE_ROW_HEIGHT - 8,
                              }}
                            >
                              <div className="shift-scheduler__shift-time">
                                {shift.start_time}-{shift.end_time}
                              </div>
                              <div className="shift-scheduler__shift-actions">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteShift(shift.public_id)
                                  }}
                                  className="shift-scheduler__shift-delete"
                                  title={strings.shift.delete}
                                >
                                  <LuX size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShiftScheduler
