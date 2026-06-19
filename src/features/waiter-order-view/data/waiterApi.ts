import { apiFetch } from "@/api/client"
import type { FloorTable, OverlayDetail, OverlayOrderItem, ReservationItem } from "./waiterTypes"

// ── API response shapes ──────────────────────────────────────────────
interface ReservationApiItem {
  public_id: string
  start_at: string
  end_at: string
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
  currency: string
  // Authoritative bill totals (Decimal strings) recomputed by the BE.
  subtotal: string
  tax: string
  service_charge: string
  total: string
}

interface OrderApiItem {
  public_id: string
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
  comment?: string | null
}

// ── Reservations ─────────────────────────────────────────────────────
function mapReservationItem(r: ReservationApiItem): ReservationItem {
  return {
    public_id: r.public_id,
    start_at: r.start_at,
    end_at: r.end_at,
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
    comment: oi.comment ?? null,
  }
}

// The BE stores money as Decimal(14,4); render it at 2 dp for the bill. This
// only reformats a single authoritative value — it never re-sums client-side.
function to2dp(value: string | undefined): string {
  const n = parseFloat(value ?? "")
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
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
  // Note: an open session with no orders yet still returns a detail (empty items)
  // so the waiter can see the open table and close the check.

  // A visit can have several Orders (one per checkout round) on the same
  // Session — gather items from all of them, not just the latest.
  const itemsPerOrder = await Promise.all(orders.map((o) => fetchOrderItems(o.public_id)))
  const orderItems = itemsPerOrder.flat()

  const selTable = tables.find((t) => t.public_id === tablePublicId)
  const resForTable = reservations.find((r) => r.table === selTable?.table_number)

  // Trust the BE-recomputed Session totals instead of re-summing order items
  // client-side: re-summing over-counted voided/wasted items and diverged from
  // the server's Decimal math. The item list is still shown for the waiter
  // (voided rows are rendered greyed by OrderItemRow).
  return {
    public_id: session.public_id,
    table_number: selTable?.table_number ?? "",
    guest_name: resForTable?.name ?? "Guest",
    guest_count: session.guest_count,
    duration: formatDuration(session.opened_at),
    currency: session.currency,
    items: orderItems,
    subtotal: to2dp(session.subtotal),
    tax_total: to2dp(session.tax),
    total_amount: to2dp(session.total),
    service_charge: to2dp(session.service_charge),
    // Session carries no separate discount; any order-level discount is already
    // reflected in session.total.
    discount_total: "0.00",
  }
}
