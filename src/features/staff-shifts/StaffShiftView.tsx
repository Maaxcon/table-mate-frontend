/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useAdminStrings } from "@/features/admin/strings"
import { useEmployees } from "@/features/admin/hooks/useEmployees"
import { fetchMonthSummary } from "./api"
import type { StaffShift } from "./types"
import "./StaffShiftView.css"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

function StaffShiftView() {
  const user = useAppSelector((s) => s.auth.user)
  const adminStrings = useAdminStrings()
  const strings = adminStrings.staffShifts
  const { employees } = useEmployees()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(user?.restaurantId ?? "")
  const [shifts, setShifts] = useState<StaffShift[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const employeeOptions = useMemo(() => {
    if (!employees) return []
    return employees.filter((e) => e.role !== "customer")
  }, [employees])

  useEffect(() => {
    if (!selectedEmployeeId) {
      setShifts([])
      setTotalHours(0)
      return
    }
    let cancelled = false
    fetchMonthSummary(year, month, selectedEmployeeId)
      .then((data) => {
        if (!cancelled) {
          setShifts(data.shifts)
          setTotalHours(data.total_hours)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [year, month, selectedEmployeeId])

  const shiftsByDay = useMemo(() => {
    const map: Record<number, StaffShift[]> = {}
    for (const s of shifts) {
      const day = new Date(s.date).getDate()
      if (!map[day]) map[day] = []
      map[day].push(s)
    }
    return map
  }, [shifts])

  const dayCells = useMemo(() => getMonthDays(year, month), [year, month])

  const navigateMonth = useCallback(
    (direction: number) => {
      setMonth((prev) => {
        const newMonth = prev + direction
        if (newMonth > 12) {
          setYear((y) => y + 1)
          return 1
        }
        if (newMonth < 1) {
          setYear((y) => y - 1)
          return 12
        }
        return newMonth
      })
      setSelectedDay(null)
    },
    [setYear],
  )

  const goToday = useCallback(() => {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    setSelectedDay(null)
  }, [setYear])

  const dayShifts = selectedDay ? (shiftsByDay[selectedDay] ?? []) : []

  return (
    <div className="staff-shifts">
      <div className="staff-shifts__header">
        <h1 className="staff-shifts__title">{strings.title}</h1>
        <div className="staff-shifts__controls">
          <select
            className="staff-shifts__employee-select"
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value)
              setSelectedDay(null)
            }}
          >
            <option value="">{strings.selectEmployee}</option>
            {employeeOptions.map((e) => (
              <option key={e.public_id} value={e.public_id}>
                {e.first_name && e.last_name ? `${e.first_name} ${e.last_name}` : e.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="staff-shifts__summary">
        <div className="staff-shifts__nav">
          <button onClick={() => navigateMonth(-1)} className="staff-shifts__nav-btn">
            <LuChevronLeft />
          </button>
          <span className="staff-shifts__month-label">
            {new Date(year, month - 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button onClick={() => navigateMonth(1)} className="staff-shifts__nav-btn">
            <LuChevronRight />
          </button>
          <button onClick={goToday} className="staff-shifts__today-btn">
            {strings.today}
          </button>
        </div>
        <div className="staff-shifts__hours">{strings.totalHours(totalHours)}</div>
      </div>

      <div className="staff-shifts__body">
        <div className="staff-shifts__calendar">
          <div className="staff-shifts__weekday-row">
            {WEEKDAYS.map((d) => (
              <div key={d} className="staff-shifts__weekday-cell">
                {d}
              </div>
            ))}
          </div>
          <div className="staff-shifts__days-grid">
            {!selectedEmployeeId ? (
              <div className="staff-shifts__message">{strings.noEmployee}</div>
            ) : dayCells.length === 0 ? (
              <div className="staff-shifts__message">{strings.noShifts}</div>
            ) : (
              dayCells.map((day, idx) => {
                if (day === null)
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="staff-shifts__day-cell staff-shifts__day-cell--empty"
                    />
                  )
                const dayShiftsForCell = shiftsByDay[day]
                const hasShift = !!dayShiftsForCell && dayShiftsForCell.length > 0
                const isSelected = selectedDay === day
                const isToday =
                  new Date().getFullYear() === year &&
                  new Date().getMonth() + 1 === month &&
                  new Date().getDate() === day
                return (
                  <button
                    key={day}
                    className={[
                      "staff-shifts__day-cell",
                      hasShift ? "staff-shifts__day-cell--has-shift" : "",
                      isSelected ? "staff-shifts__day-cell--selected" : "",
                      isToday ? "staff-shifts__day-cell--today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <span className="staff-shifts__day-number">{day}</span>
                    {hasShift && <span className="staff-shifts__day-dot" />}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {selectedDay !== null && (
          <div className="staff-shifts__day-detail">
            <div className="staff-shifts__day-detail-header">
              <h3>
                {strings.dayDetail.title(
                  `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`,
                )}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="staff-shifts__day-detail-close"
              >
                {strings.dayDetail.close}
              </button>
            </div>
            {dayShifts.length === 0 ? (
              <p className="staff-shifts__message">{strings.noShifts}</p>
            ) : (
              <div className="staff-shifts__day-shifts">
                {dayShifts.map((shift) => (
                  <div key={shift.shift_id} className="staff-shifts__day-shift-card">
                    <div className="staff-shifts__day-shift-time">
                      {shift.start_time} — {shift.end_time}
                    </div>
                    <div className="staff-shifts__day-shift-duration">
                      {strings.shiftCount(1)} · {shift.duration_hours}h
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffShiftView
