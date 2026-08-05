import { api } from "@/api/client"
import type { StaffMonthSummary } from "./types"

export function fetchMonthSummary(
  year: number,
  month: number,
  employeeId?: string,
): Promise<StaffMonthSummary> {
  const query: Record<string, string> = {
    year: String(year),
    month: String(month),
  }
  if (employeeId) query.employee_id = employeeId
  return api.get<StaffMonthSummary>("/api/shifts/month_summary/", { query })
}
