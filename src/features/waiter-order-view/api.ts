import { apiFetch } from "@/api/client"
import {
  formatDuration,
  type FloorTable,
  type OverlayDetail,
  type OverlayOrderItem,
  type ReservationItem,
} from "./types"

// ── API response shapes ──────────────────────────────────────────────
interface ReservationApiItem {
  public_id: string
  start_at: string
  end_at: string
  session_ends_at: string | null
  table_info: { public_number: string } | null
  guest_count: number
  status: string
  notes?: string | null
  customer_name?: string
  has_preorder?: boolean
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

interface OrderItemApiItem {
  public_id: string
  guest_slot: number
  guest_display_name?: string | null
  quantity: number
  status: string
  is_wasted: boolean
  void_reason?: number | null
  unit_price: string
  payable: string
  is_paid: boolean
  menu_item_name?: string
  comment?: string | null
}

// ── Reservations ─────────────────────────────────────────────────────
function mapReservationItem(r: ReservationApiItem): ReservationItem {
  return {
    public_id: r.public_id,
    start_at: r.start_at,
    end_at: r.end_at,
    session_ends_at: r.session_ends_at,
    table: r.table_info?.public_number ?? "",
    guest_count: r.guest_count,
    status: r.status as ReservationItem["status"],
    notes: r.notes,
    name: r.customer_name ?? "Guest",
    has_preorder: r.has_preorder ?? false,
  }
}

export async function fetchReservations(signal?: AbortSignal): Promise<ReservationItem[] | null> {
  const res = await apiFetch(
    `/api/reservations/reservations/?status__in=pending,active`,
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
    guest_display_name: oi.guest_display_name ?? null,
    quantity: oi.quantity,
    name: oi.menu_item_name ?? oi.public_id,
    unit_price: oi.unit_price,
    payable: oi.payable,
    is_paid: oi.is_paid,
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

const MAX_ITEM_PAGES = 100

// Fetch every order item for a session in one filtered, paginated query —
// instead of one request per order (the old N+1 waterfall). The BE filter
// order__session__public_id spans all of the visit's orders/rounds.
async function fetchSessionOrderItems(sessionPublicId: string): Promise<OverlayOrderItem[]> {
  const all: OverlayOrderItem[] = []
  for (let page = 1; page <= MAX_ITEM_PAGES; page += 1) {
    const res = await apiFetch(
      `/api/orders/order-items/?order__session__public_id=${sessionPublicId}&page=${page}`,
    )
    if (!res.ok) break
    const data = (await res.json()) as { next?: string | null; results?: OrderItemApiItem[] }
    all.push(...(data.results ?? []).map(mapOrderItem))
    if (!data.next) break
  }
  return all
}

// Build the open-table overlay for a table from its visit Session and Orders.
// Returns null when the table has no open session. An open session with no
// orders yet still returns a detail (empty items) so the waiter can see the
// open table and close the check.
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

  // One query across all the visit's orders, not one per order.
  const orderItems = await fetchSessionOrderItems(session.public_id)

  const selTable = tables.find((t) => t.public_id === tablePublicId)
  const resForTable = reservations.find((r) => r.table === selTable?.public_number)

  // Trust the BE-recomputed Session totals instead of re-summing order items
  // client-side: re-summing over-counted voided/wasted items and diverged from
  // the server's Decimal math. The item list is still shown for the waiter
  // (voided rows are rendered greyed by OrderItemRow).
  return {
    public_id: session.public_id,
    table_number: selTable?.public_number ?? "",
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
