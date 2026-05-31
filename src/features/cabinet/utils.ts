// "Member since 2024" from an ISO date string.
export function memberSinceYear(isoDate: string): string {
  const year = new Date(isoDate).getFullYear()
  return Number.isNaN(year) ? "—" : String(year)
}

// "18 May 2026, 19:30" — short, readable date + time for bookings/history.
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// "$48.50" using the entry's currency.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}
