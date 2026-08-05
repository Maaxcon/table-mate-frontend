import { api } from "@/api/client"
import type { MonthSummaryData } from "./types"

export function fetchMonthSummary(
  year: number,
  month: number,
  employeeId?: string,
): Promise<MonthSummaryData> {
  const query: Record<string, string> = {
    year: String(year),
    month: String(month),
  }
  if (employeeId) query.employee_id = employeeId
  return api.get<MonthSummaryData>("/api/shifts/month_summary/", { query })
}
