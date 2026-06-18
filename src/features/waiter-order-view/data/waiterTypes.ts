import type { Table, Reservation, OrderItemStatusEnum } from "@/types/api/types.gen"

export type FloorTable = Pick<
  Table,
  | "public_id"
  | "table_number"
  | "capacity"
  | "shape"
  | "is_occupied"
  | "position_x"
  | "position_y"
  | "active"
> & {
  zone?: { public_id: string; name: string } | null
}

export interface UpcomingReservation {
  public_id: string
  table_id: string
  start_at: string
}

export type VisualTableStatus = "free" | "occupied" | "reserved"

export type ReservationItem = Pick<
  Reservation,
  "public_id" | "start_at" | "guest_count" | "status" | "notes"
> & {
  table: string
  name: string
}

export interface OverlayOrderItem {
  public_id: string
  guest_slot: number
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

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

export function getTableVisualStatus(
  table: FloorTable,
  upcomingReservations: UpcomingReservation[],
  currentTime: Date,
): VisualTableStatus {
  if (table.is_occupied) return "occupied"
  const hasImminentReservation = upcomingReservations.some(
    (r) =>
      r.table_id === table.public_id &&
      new Date(r.start_at).getTime() - currentTime.getTime() <= FIFTEEN_MINUTES_MS &&
      new Date(r.start_at).getTime() > currentTime.getTime(),
  )
  if (hasImminentReservation) return "reserved"
  return "free"
}
