/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useAdminStrings } from "@/features/admin/strings"
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

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shifts, setShifts] = useState<StaffShift[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMonthSummary(year, month)
      .then((data) => {
        if (!cancelled) {
          setShifts(data.shifts)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load shifts.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [year, month, user])

  const myPublicId = user?.public_id ?? ""

  const myShifts = useMemo(
    () => shifts.filter((s) => s.employee_id === myPublicId),
    [shifts, myPublicId],
  )

  const myTotalHours = useMemo(
    () => myShifts.reduce((sum, s) => sum + s.duration_hours, 0),
    [myShifts],
  )

  const myShiftDaySet = useMemo(() => {
    const set = new Set<number>()
    for (const s of myShifts) {
      set.add(new Date(s.date).getDate())
    }
    return set
  }, [myShifts])

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

  const dayShifts = useMemo(
    () => (selectedDay ? (shiftsByDay[selectedDay] ?? []) : []),
    [selectedDay, shiftsByDay],
  )

  const groupedDayShifts = useMemo(() => {
    const groups: Record<
      string,
      { employee_id: string; employee_name: string; employee_role: string; shifts: StaffShift[] }
    > = {}
    for (const s of dayShifts) {
      if (!groups[s.employee_id]) {
        groups[s.employee_id] = {
          employee_id: s.employee_id,
          employee_name: s.employee_name,
          employee_role: s.employee_role,
          shifts: [],
        }
      }
      groups[s.employee_id].shifts.push(s)
    }
    return Object.values(groups)
  }, [dayShifts])

  return (
    <div className="staff-shifts">
      <h1 className="staff-shifts__title">{strings.title}</h1>

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
        <div className="staff-shifts__hours">{strings.totalHours(myTotalHours)}</div>
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
            {loading ? (
              <div className="staff-shifts__message">{strings.loading}</div>
            ) : error ? (
              <div className="staff-shifts__message">
                <p>{error}</p>
                <button onClick={() => setError(null)} className="staff-shifts__today-btn">
                  Retry
                </button>
              </div>
            ) : shifts.length === 0 ? (
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
                const hasMyShift = myShiftDaySet.has(day)
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
                      hasMyShift ? "staff-shifts__day-cell--my-shift" : "",
                      isSelected ? "staff-shifts__day-cell--selected" : "",
                      isToday ? "staff-shifts__day-cell--today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <span className="staff-shifts__day-number">{day}</span>
                    {hasShift && (
                      <span
                        className={
                          hasMyShift
                            ? "staff-shifts__day-dot staff-shifts__day-dot--mine"
                            : "staff-shifts__day-dot"
                        }
                      />
                    )}
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
                {groupedDayShifts.map((group) => (
                  <div key={group.employee_id} className="staff-shifts__day-employee-group">
                    <div className="staff-shifts__day-employee-header">
                      <span className="staff-shifts__day-employee-name">
                        {group.employee_name}
                        {group.employee_id === myPublicId ? " (You)" : ""}
                      </span>
                      <span className="staff-shifts__day-employee-role">{group.employee_role}</span>
                    </div>
                    {group.shifts.map((shift) => (
                      <div
                        key={shift.shift_id}
                        className={`staff-shifts__day-shift-card${group.employee_id === myPublicId ? " staff-shifts__day-shift-card--mine" : ""}`}
                      >
                        <div className="staff-shifts__day-shift-time">
                          {shift.start_time} — {shift.end_time}
                        </div>
                        <div className="staff-shifts__day-shift-duration">
                          {strings.shiftCount(1)} · {shift.duration_hours}h
                        </div>
                      </div>
                    ))}
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
