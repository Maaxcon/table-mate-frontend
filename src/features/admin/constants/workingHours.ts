import type { WeekDay, WorkingHours, WorkingHoursDay } from "@/features/admin/types"

export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
]

// A day is invalid when it is open but has a missing or equal open/close time.
export function dayInvalid(day: WorkingHoursDay | undefined): boolean {
  return !!day && (!day.open || !day.close || day.open === day.close)
}

export function hasInvalidWorkingHours(value: WorkingHours): boolean {
  return WEEK_DAYS.some(({ key }) => dayInvalid(value[key]))
}
