import type { Table, Reservation, OrderItemStatusEnum } from "@/types/api/types.gen"

export interface TableReservationInfo {
  public_id: string
  guest_name: string
  guest_count: number
  start_at: string
}

export interface TableSessionInfo {
  public_id: string
  opened_at: string
  guest_count: number
}

export type FloorTable = Pick<
  Table,
  "public_id" | "public_number" | "capacity" | "is_occupied" | "active"
> & {
  shape: string
  position_x: number | null
  position_y: number | null
  zone?: { public_id: string; name: string } | null
  activeReservation?: TableReservationInfo | null
  activeSession?: TableSessionInfo | null
}

export interface UpcomingReservation {
  public_id: string
  table_id: string
  start_at: string
  end_at?: string
  customer_name?: string
  guest_count?: number
}

export type VisualTableStatus = "free" | "occupied" | "reserved"

export type ReservationItem = Pick<
  Reservation,
  "public_id" | "start_at" | "end_at" | "session_ends_at" | "guest_count" | "status" | "notes"
> & {
  table: string
  name: string
  // Optional: locally-constructed reservation objects (optimistic updates,
  // tests) don't know this yet. Only the API mapper (features/waiter-order-view/api.ts)
  // populates it for real.
  has_preorder?: boolean
  // True once the kitchen has picked up the pre-order (a Ticket exists) —
  // distinct from just being paid. Same caveat as has_preorder above.
  preorder_cooking?: boolean
}

// A reservation's paid pre-order — what the guest picked ahead of arrival.
export type PreorderItem = {
  name: string
  quantity: number
  totalPrice: number
}

export type Preorder = {
  currency: string
  total: number
  items: PreorderItem[]
  // False once the kitchen has already picked it up — staff can no longer
  // cancel it from here at that point.
  canCancel: boolean
}

export interface OverlayOrderItem {
  public_id: string
  guest_slot: number
  guest_display_name: string | null
  quantity: number
  name: string
  unit_price: string
  payable: string
  is_paid: boolean
  status: OrderItemStatusEnum
  is_wasted: boolean
  void_reason?: number | null
  comment?: string | null
}

export interface OverlayDetail {
  public_id: string
  table_number: string
  guest_name: string
  guest_count: number
  duration: string
  currency: string
  items: OverlayOrderItem[]
  subtotal: string
  tax_total: string
  total_amount: string
  discount_total?: string
  service_charge?: string
}

export const VOID_REASON_LABELS: Record<number, string> = {
  1: "mispick",
  2: "guest_changed_mind",
  3: "quality_issue",
  4: "out_of_stock",
}

export function getTimeFromDatetime(datetime: string): string {
  const d = new Date(datetime)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

// "12:00–14:00" — the booking window. Falls back to just the start if no end.
export function formatTimeRange(start: string, end?: string | null): string {
  return end
    ? `${getTimeFromDatetime(start)}–${getTimeFromDatetime(end)}`
    : getTimeFromDatetime(start)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Stable grouping key for a reservation's date, relative to "now" — "today",
// "tomorrow", or an ISO "YYYY-MM-DD" for anything further out. Locale-free on
// purpose so grouping/sorting never depends on how the label is displayed.
export function dateGroupKey(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "unknown"
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Human label for a dateGroupKey — "Today"/"Tomorrow" (translated by the
// caller) for those two keys, otherwise a short locale date like "Fri, Aug 1".
export function formatDateGroupLabel(
  key: string,
  todayLabel: string,
  tomorrowLabel: string,
  locale?: string,
): string {
  if (key === "today") return todayLabel
  if (key === "tomorrow") return tomorrowLabel
  const d = new Date(key)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })
}

// Groups reservations by dateGroupKey, preserving each group's relative
// order, and orders groups today -> tomorrow -> chronological afterwards.
export function groupReservationsByDate<T extends { start_at: string }>(
  items: T[],
  now: Date,
): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = dateGroupKey(item.start_at, now)
    const group = map.get(key)
    if (group) group.push(item)
    else map.set(key, [item])
  }
  const rank = (key: string) => (key === "today" ? 0 : key === "tomorrow" ? 1 : 2)
  return [...map.entries()].sort(([a], [b]) => {
    const diff = rank(a) - rank(b)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

export function formatDuration(openedAt: string): string {
  const opened = new Date(openedAt).getTime()
  if (Number.isNaN(opened)) return "0m"
  const minutes = Math.max(0, Math.round((Date.now() - opened) / 60000))
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins === 0 ? `${hours}h` : `${hours}h${mins}m`
  }
  return `${minutes}m`
}

export function formatETA(startAt: string): string {
  const start = new Date(startAt).getTime()
  if (Number.isNaN(start)) return "soon"
  const diffMinutes = Math.max(0, Math.round((start - Date.now()) / 60000))
  if (diffMinutes >= 60) {
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    return mins === 0 ? `${hours}h` : `${hours}h${mins}m`
  }
  return diffMinutes === 0 ? "now" : `${diffMinutes}m`
}

export function getTableVisualStatus(
  table: FloorTable,
  upcomingReservations: UpcomingReservation[],
  currentTime: Date,
): VisualTableStatus {
  if (table.is_occupied) return "occupied"
  const now = currentTime.getTime()
  const hasRelevantReservation = upcomingReservations.some((r) => {
    if (r.table_id !== table.public_id) return false
    const start = new Date(r.start_at).getTime()
    if (start > now && start - now <= FIFTEEN_MINUTES_MS) return true
    if (start <= now) {
      if (r.end_at) {
        const end = new Date(r.end_at).getTime()
        if (now < end) return true
      }
    }
    return false
  })
  if (hasRelevantReservation) return "reserved"
  return "free"
}
