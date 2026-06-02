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

import type { HistoryEntry } from "./types"

export type CabinetStats = {
  visits: number
  totalSpent: number
  currency: string
  favoriteRestaurant: string | null
}

// Summarize a user's visit history for the stats cards.
export function computeCabinetStats(history: HistoryEntry[]): CabinetStats {
  const visits = history.length

  const spentByCurrency = new Map<string, number>()
  const countByCurrency = new Map<string, number>()
  for (const h of history) {
    spentByCurrency.set(h.currency, (spentByCurrency.get(h.currency) ?? 0) + h.total)
    countByCurrency.set(h.currency, (countByCurrency.get(h.currency) ?? 0) + 1)
  }
  let currency = "USD"
  let bestCurrencyCount = 0
  for (const [cur, n] of countByCurrency) {
    if (n > bestCurrencyCount) {
      bestCurrencyCount = n
      currency = cur
    }
  }
  const totalSpent = spentByCurrency.get(currency) ?? 0

  // Favorite = the restaurant visited most often.
  const counts = new Map<string, number>()
  for (const h of history) {
    counts.set(h.restaurantName, (counts.get(h.restaurantName) ?? 0) + 1)
  }
  let favoriteRestaurant: string | null = null
  let best = 0
  for (const [name, n] of counts) {
    if (n > best) {
      best = n
      favoriteRestaurant = name
    }
  }

  return { visits, totalSpent, currency, favoriteRestaurant }
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

// Currency symbols we render directly; everything else shows the 3-letter code.
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", UAH: "₴" }

// Single money formatter used everywhere (screen + PDF) so they always match.
// Locale-independent: a dot decimal and no surprise NBSP/commas.
export function formatMoney(amount: number, currency: string): string {
  const value = amount.toFixed(2)
  const symbol = CURRENCY_SYMBOLS[currency]
  return symbol ? `${symbol}${value}` : `${value} ${currency}`
}
