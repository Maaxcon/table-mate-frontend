import type {
  TableStatus,
  TableShape,
  OrderItemStatusEnum,
  ReservationStatus,
} from "@/types/api/types.gen"

export interface FloorTable {
  public_id: string
  table_number: string
  capacity: number
  shape: TableShape
  status: TableStatus
  position_x: number | null
  position_y: number | null
  active: boolean
  zone?: { public_id: string; name: string } | null
}

export interface ReservationItem {
  public_id: string
  start_at: string
  table: string
  guest_count: number
  status: ReservationStatus
  notes?: string | null

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
