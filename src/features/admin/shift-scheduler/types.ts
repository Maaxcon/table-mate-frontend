export interface ShiftSchedulerShift {
  public_id: string
  employee: string
  employee_name: string
  employee_role: string
  date: string
  start_time: string
  end_time: string
  notes: string
  duration_hours: number
}

export interface ShiftWritePayload {
  employee: string
  date: string
  start_time: string
  end_time: string
  notes: string
}

export interface ShiftCopyPayload {
  source_date: string
  target_dates: string[]
  employee_ids?: string[]
}

export interface MonthSummaryResponse {
  total_hours: number
  shifts: MonthSummaryShift[]
}

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

export interface EmployeeOnAxis {
  public_id: string
  name: string
  role: string
}
