/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronDown,
  LuChevronUp,
  LuArrowUpDown,
} from "react-icons/lu"
import { useSearchParams } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import { useAdminStrings } from "@/features/admin/strings"
import { fetchMonthSummary } from "./api"
import type { MonthSummaryShift } from "./types"
import "./MonthSummary.css"

interface EmployeeRow {
  employee_id: string
  employee_name: string
  employee_role: string
  total_hours: number
  shifts: MonthSummaryShift[]
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function MonthSummary() {
  const user = useAppSelector((s) => s.auth.user)
  const adminStrings = useAdminStrings()
  const strings = adminStrings.monthSummary
  const [searchParams, setSearchParams] = useSearchParams()

  const now = new Date()
  const [year, setYear] = useState(() => {
    const p = searchParams.get("year")
    return p ? parseInt(p, 10) : now.getFullYear()
  })
  const [month, setMonth] = useState(() => {
    const p = searchParams.get("month")
    return p ? parseInt(p, 10) : now.getMonth() + 1
  })
  const [data, setData] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(false)

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    setSearchParams({ year: String(year), month: String(month) }, { replace: true })
  }, [year, month, setSearchParams])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const employeeId = isAdmin ? undefined : (user.restaurantId ?? undefined)

    fetchMonthSummary(year, month, employeeId)
      .then((result) => {
        if (!cancelled) {
          const grouped: Record<string, EmployeeRow> = {}
          for (const s of result.shifts) {
            if (!grouped[s.employee_id]) {
              grouped[s.employee_id] = {
                employee_id: s.employee_id,
                employee_name: s.employee_name,
                employee_role: s.employee_role,
                total_hours: 0,
                shifts: [],
              }
            }
            grouped[s.employee_id].total_hours += s.duration_hours
            grouped[s.employee_id].shifts.push(s)
          }
          setData(Object.values(grouped))
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load month summary. Retry.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [year, month, user, isAdmin])

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
      setExpandedId(null)
    },
    [setYear],
  )

  const goToday = useCallback(() => {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    setExpandedId(null)
  }, [])

  const sortedData = useMemo(() => {
    const sorted = [...data]
    sorted.sort((a, b) => (sortAsc ? a.total_hours - b.total_hours : b.total_hours - a.total_hours))
    return sorted
  }, [data, sortAsc])

  if (!user) return null

  return (
    <div className="month-summary">
      <div className="month-summary__header">
        <h1 className="month-summary__title">{isAdmin ? strings.title : strings.myHours}</h1>
      </div>

      <div className="month-summary__nav">
        <div className="month-summary__nav-group">
          <button onClick={() => navigateMonth(-1)} className="month-summary__nav-btn">
            <LuChevronLeft />
          </button>
          <span className="month-summary__month-label">
            {strings.monthLabel(MONTH_NAMES[month - 1], year)}
          </span>
          <button onClick={() => navigateMonth(1)} className="month-summary__nav-btn">
            <LuChevronRight />
          </button>
          <button onClick={goToday} className="month-summary__today-btn">
            {adminStrings.staffShifts.today}
          </button>
        </div>
      </div>

      <div className="month-summary__body">
        {loading ? (
          <div className="month-summary__state">{strings.loading}</div>
        ) : error ? (
          <div className="month-summary__state">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="month-summary__retry-btn">
              {strings.retry}
            </button>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="month-summary__state">{strings.noData}</div>
        ) : (
          <div className="month-summary__table-wrap">
            <table className="month-summary__table">
              <thead>
                <tr>
                  <th className="month-summary__th month-summary__th--name">{strings.employee}</th>
                  {isAdmin && <th className="month-summary__th">{strings.role}</th>}
                  <th
                    className="month-summary__th month-summary__th--sortable"
                    onClick={() => setSortAsc((prev) => !prev)}
                  >
                    {strings.totalHours} <LuArrowUpDown size={14} />
                  </th>
                  <th className="month-summary__th">{strings.shiftCount}</th>
                  <th className="month-summary__th" />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <React.Fragment key={row.employee_id}>
                    <tr
                      className="month-summary__row"
                      onClick={() =>
                        setExpandedId(expandedId === row.employee_id ? null : row.employee_id)
                      }
                    >
                      <td className="month-summary__td month-summary__td--name">
                        {row.employee_name}
                      </td>
                      {isAdmin && (
                        <td className="month-summary__td month-summary__td--role">
                          {row.employee_role}
                        </td>
                      )}
                      <td className="month-summary__td month-summary__td--hours">
                        {row.total_hours.toFixed(1)}
                      </td>
                      <td className="month-summary__td month-summary__td--count">
                        {row.shifts.length}
                      </td>
                      <td className="month-summary__td month-summary__td--expand">
                        {expandedId === row.employee_id ? <LuChevronUp /> : <LuChevronDown />}
                      </td>
                    </tr>
                    {expandedId === row.employee_id && (
                      <tr className="month-summary__detail-row">
                        <td colSpan={isAdmin ? 5 : 4}>
                          <div className="month-summary__detail">
                            <table className="month-summary__detail-table">
                              <thead>
                                <tr>
                                  <th className="month-summary__detail-th">{strings.date}</th>
                                  <th className="month-summary__detail-th">{strings.start}</th>
                                  <th className="month-summary__detail-th">{strings.end}</th>
                                  <th className="month-summary__detail-th">{strings.duration}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.shifts.map((s) => (
                                  <tr key={s.shift_id} className="month-summary__detail-row-item">
                                    <td className="month-summary__detail-td">{s.date}</td>
                                    <td className="month-summary__detail-td">{s.start_time}</td>
                                    <td className="month-summary__detail-td">{s.end_time}</td>
                                    <td className="month-summary__detail-td">
                                      {s.duration_hours.toFixed(1)}h
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MonthSummary
