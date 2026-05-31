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

// Basic email shape check: something@something.something.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

// Ukrainian numbers are +380 followed by 9 national digits (e.g. 67 123 45 67).
// We store and edit only those 9 digits; the +380 prefix is fixed in the UI.

// Pull the 9 national digits out of any stored phone string.
export function extractUaNational(raw: string | null): string {
  if (!raw) return ""
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("380")) digits = digits.slice(3)
  else if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 9)
}

// Format national digits for display: "67 123 45 67".
export function formatUaNational(digits: string): string {
  const d = digits.slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ")
}

// Build the full number to send to the server, or "" when empty.
export function composeUaPhone(digits: string): string {
  return digits ? `+380${digits}` : ""
}

// Valid when empty (phone is optional) or exactly 9 national digits.
export function isValidUaNational(digits: string): boolean {
  return digits.length === 0 || digits.length === 9
}

// "$48.50" using the entry's currency.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}
