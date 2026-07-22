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
}

export interface OverlayOrderItem {
  public_id: string
  guest_slot: number
  guest_display_name: string | null
  quantity: number
  name: string
  unit_price: string
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
