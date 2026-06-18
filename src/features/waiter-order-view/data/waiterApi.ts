import { apiFetch } from "@/api/client"
import type { FloorTable, OverlayDetail, OverlayOrderItem, ReservationItem } from "./waiterTypes"

// ── API response shapes ──────────────────────────────────────────────
interface ReservationApiItem {
  public_id: string
  start_at: string
  table_info: { table_number: string } | null
  guest_count: number
  status: string
  notes?: string | null
  customer_name?: string
}

interface SessionApiItem {
  public_id: string
  table: string
  guest_count: number
  opened_at: string
  status: string
}

interface OrderApiItem {
  public_id: string
  currency: string
  total_amount: string
  tax_total: string
  discount_total?: string
  service_charge?: string
}

interface OrderItemApiItem {
  public_id: string
  guest_slot: number
  quantity: number
  status: string
  is_wasted: boolean
  void_reason?: number | null
  unit_price: string
  menu_item_name?: string
}

// ── Reservations ─────────────────────────────────────────────────────
function mapReservationItem(r: ReservationApiItem): ReservationItem {
  return {
    public_id: r.public_id,
    start_at: r.start_at,
    table: r.table_info?.table_number ?? "",
    guest_count: r.guest_count,
    status: r.status as ReservationItem["status"],
    notes: r.notes,
    name: r.customer_name ?? "Guest",
  }
}

export async function fetchReservations(signal?: AbortSignal): Promise<ReservationItem[] | null> {
  const res = await apiFetch(
    `/api/reservations/reservations/?status=pending&status=active`,
    signal ? { signal } : undefined,
  )
  if (!res.ok) return null
  const data = (await res.json()) as { results?: ReservationApiItem[] }
  return (data.results ?? []).map(mapReservationItem)
}

// ── Open-table overlay ───────────────────────────────────────────────
function mapOrderItem(oi: OrderItemApiItem): OverlayOrderItem {
  return {
    public_id: oi.public_id,
    guest_slot: oi.guest_slot,
    quantity: oi.quantity,
    name: oi.menu_item_name ?? oi.public_id,
    unit_price: oi.unit_price,
    status: oi.status as OverlayOrderItem["status"],
    is_wasted: oi.is_wasted,
    void_reason: oi.void_reason,
  }
}

function formatDuration(openedAt: string): string {
  const minutes = Math.round((Date.now() - new Date(openedAt).getTime()) / 60000)
  return minutes > 60 ? `${Math.floor(minutes / 60)}h${minutes % 60}m` : `${minutes}m`
}

async function fetchOrderItems(orderId: string): Promise<OverlayOrderItem[]> {
  const res = await apiFetch(`/api/orders/order-items/?order__public_id=${orderId}`)
  if (!res.ok) return []
  const data = (await res.json()) as { results?: OrderItemApiItem[] }
  return (data.results ?? []).map(mapOrderItem)
}

// Build the open-table overlay for a table from its visit Session and Orders.
// Returns null when the table has no open session or no orders yet.
export async function fetchOverlayDetail(
  tablePublicId: string,
  tables: FloorTable[],
  reservations: ReservationItem[],
): Promise<OverlayDetail | null> {
  const sessionRes = await apiFetch(
    `/api/orders/sessions/?table__public_id=${tablePublicId}&status=open`,
  )
  if (!sessionRes.ok) return null
  const sessionData = (await sessionRes.json()) as { results?: SessionApiItem[] }
  const session = (sessionData.results ?? [])[0]
  if (!session) return null

  const ordersRes = await apiFetch(`/api/orders/orders/?session__public_id=${session.public_id}`)
  let orders: OrderApiItem[] = []
  if (ordersRes.ok) {
    const orderData = (await ordersRes.json()) as { results?: OrderApiItem[] }
    orders = orderData.results ?? []
  }
  if (orders.length === 0) return null

  // A visit can have several Orders (one per checkout round) on the same
  // Session — gather items from all of them, not just the latest.
  const itemsPerOrder = await Promise.all(orders.map((o) => fetchOrderItems(o.public_id)))
  const orderItems = itemsPerOrder.flat()

  const selTable = tables.find((t) => t.public_id === tablePublicId)
  const resForTable = reservations.find((r) => r.table === selTable?.table_number)

  const rawSubtotal = orderItems.reduce(
    (sum, item) => sum + parseFloat(item.unit_price) * item.quantity,
    0,
  )
  const rawTax = orders.reduce((sum, o) => sum + parseFloat(o.tax_total || "0"), 0)
  const rawDiscount = orders.reduce((sum, o) => sum + parseFloat(o.discount_total || "0"), 0)
  const rawServiceCharge = orders.reduce((sum, o) => sum + parseFloat(o.service_charge || "0"), 0)
  const rawTotal = rawSubtotal + rawTax - rawDiscount + rawServiceCharge

  return {
    public_id: session.public_id,
    table_number: selTable?.table_number ?? "",
    guest_name: resForTable?.name ?? "Guest",
    guest_count: session.guest_count,
    duration: formatDuration(session.opened_at),
    currency: orders[0].currency,
    items: orderItems,
    subtotal: rawSubtotal.toFixed(2),
    tax_total: rawTax.toFixed(2),
    total_amount: rawTotal.toFixed(2),
    discount_total: rawDiscount.toFixed(2),
    service_charge: rawServiceCharge.toFixed(2),
  }
}
