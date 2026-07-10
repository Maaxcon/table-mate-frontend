import { useMemo } from "react"
import { localDateKey, todayInTz } from "../utils"

// The venue's "today" plus the next `days` calendar days, as local Date
// objects (midnight). Keyed to the restaurant's timezone, not the guest's
// device clock, and re-keyed on the venue's calendar day so the window
// refreshes after local midnight if the page/modal is left open.
export function useDateWindow(timeZone: string | null, days = 14) {
  const todayKey = localDateKey(todayInTz(timeZone))
  const today = useMemo(() => {
    const [y, m, d] = todayKey.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [todayKey])

  const dates = useMemo(() => {
    const out: Date[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      out.push(d)
    }
    return out
  }, [today, days])

  return { today, dates }
}
