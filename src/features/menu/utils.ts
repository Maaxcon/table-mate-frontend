const PRICE_FORMATTER = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatPrice(price: string): string {
  const num = parseFloat(price)
  return isNaN(num) ? price : PRICE_FORMATTER.format(num)
}

export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return String(amount)
  return PRICE_FORMATTER.format(amount)
}

type WorkingHoursDay = { open: string; close: string }
type WorkingHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", WorkingHoursDay>
>

const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
type DayKey = (typeof DAY_ORDER)[number]

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function dayIndexToKey(dayIndex: number): DayKey {
  return DAY_ORDER[dayIndex] ?? "sun"
}

function getNowInTimezone(timezone: string): { dayKey: DayKey; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date())

    const weekdayPart = parts.find((p) => p.type === "weekday")?.value.toLowerCase()
    const hourPart = parts.find((p) => p.type === "hour")?.value
    const minutePart = parts.find((p) => p.type === "minute")?.value
    if (!weekdayPart || !hourPart || !minutePart) return null

    const dayMap: Record<string, DayKey> = {
      sun: "sun",
      mon: "mon",
      tue: "tue",
      wed: "wed",
      thu: "thu",
      fri: "fri",
      sat: "sat",
    }
    const dayKey = dayMap[weekdayPart.slice(0, 3)] ?? "sun"
    const minutes = Number(hourPart) * 60 + Number(minutePart)
    return { dayKey, minutes }
  } catch {
    return null
  }
}

function isOpenFromTodaySchedule(
  nowMinutes: number,
  daySchedule: WorkingHoursDay | undefined,
): boolean {
  if (!daySchedule) return false
  const open = parseTimeToMinutes(daySchedule.open)
  const close = parseTimeToMinutes(daySchedule.close)
  if (open === null || close === null) return false
  if (open <= close) return nowMinutes >= open && nowMinutes < close
  return nowMinutes >= open
}

function isOpenFromPreviousOvernightSchedule(
  nowMinutes: number,
  previousDaySchedule: WorkingHoursDay | undefined,
): boolean {
  if (!previousDaySchedule) return false
  const open = parseTimeToMinutes(previousDaySchedule.open)
  const close = parseTimeToMinutes(previousDaySchedule.close)
  if (open === null || close === null) return false
  if (open <= close) return false
  return nowMinutes < close
}

export function isRestaurantOpenNow(workingHours: WorkingHours, timezone: string): boolean {
  const now = getNowInTimezone(timezone)
  if (!now) return true

  const todayIndex = DAY_ORDER.indexOf(now.dayKey)
  const previousIndex = (todayIndex + 6) % 7
  const todayKey = dayIndexToKey(todayIndex)
  const previousKey = dayIndexToKey(previousIndex)

  if (isOpenFromTodaySchedule(now.minutes, workingHours[todayKey])) return true
  return isOpenFromPreviousOvernightSchedule(now.minutes, workingHours[previousKey])
}

export function getCurrencySymbol(code: string): string {
  const normalized = code.toUpperCase()
  if (normalized === "UAH") return "₴"
  if (normalized === "EUR") return "€"
  if (normalized === "GBP") return "£"
  return "$"
}
