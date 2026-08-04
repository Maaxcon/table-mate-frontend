import type { UserRole } from "@/features/auth/types"

// Profile shown in the cabinet header. Built from GET /api/auth/me/.
export type CabinetProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: UserRole
  // ISO date string of when the account was created — used for "Member since YYYY".
  createdAt: string
}

// Reservation statuses returned by the backend.
export type ReservationStatus = "pending" | "active" | "cancelled" | "completed"

// One reservation from GET /api/reservations/reservations/my/.
export type Reservation = {
  public_id: string
  table: string | null
  table_info?: {
    public_id: string
    public_number: string
    capacity: number
  }
  restaurant: string
  restaurant_info?: {
    public_id: string
    name: string
  }
  guest_count: number
  start_at: string
  end_at: string
  status: ReservationStatus
  notes: string | null
  has_preorder?: boolean
  // True once the kitchen has picked up the pre-order (a Ticket exists) —
  // distinct from just being paid.
  preorder_cooking?: boolean
  preorder_ready?: boolean
  preorder_total?: string | null
  preorder_items_count?: number
  preorder_currency?: string | null
  // False from PREORDER_LEAD_MINUTES before the start: the kitchen has the
  // food by then, so the backend refuses another round.
  can_preorder?: boolean
}

// A booking's current paid pre-order (GET .../preorder/), or the shape of
// nothing to show when there isn't one (204).
export type PreorderItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export type Preorder = {
  orderId: string
  currency: string
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
  isCooking: boolean
  canCancel: boolean
  canAddMore: boolean
  items: PreorderItem[]
}

// A single line on a receipt.
export type ReceiptItem = {
  name: string
  quantity: number
  // Unit price in major currency units.
  unitPrice: number
}

// One past visit shown in the History list and the receipt modal.
// NOTE: there is no customer order-history endpoint yet, so this is filled
// with seeded mock data for now. The shape mirrors the future Order payload.
export type HistoryEntry = {
  id: string
  // Human-friendly receipt/order number, e.g. "TM-2026-0518-014".
  orderNumber: string
  // Restaurant public_id — used to open the restaurant's menu.
  restaurantId: string
  restaurantName: string
  restaurantImage: string
  restaurantAddress: string
  restaurantPhone: string
  // ISO date string of the visit.
  date: string
  currency: string
  tableLabel: string
  server: string
  guests: number
  items: ReceiptItem[]
  // All amounts are in major currency units.
  subtotal: number
  tax: number
  serviceCharge: number
  tip: number
  total: number
  paymentMethod: "card" | "cash"
  paymentStatus: string
}
