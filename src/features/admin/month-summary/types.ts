export interface MonthSummaryShift {
  shift_id: string
  employee_id: string
  employee_name: string
  employee_role: string
  date: string
  start_time: string
  end_time: string
  duration_hours: number
}

export interface MonthSummaryData {
  total_hours: number
  shifts: MonthSummaryShift[]
}
