// A booking's paid pre-order, as the guest and the staff both see it
// (GET /api/reservations/reservations/{id}/preorder/).
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
  // False from PREORDER_LEAD_MINUTES before the booking starts: the kitchen
  // has the food by then, so the backend refuses another round.
  canAddMore: boolean
  items: PreorderItem[]
}

// The booking fields the pre-order entry point and dialog read. Kept
// structural so every list can pass its own reservation shape.
export type PreorderBooking = {
  public_id: string
  restaurant: string
  table: string | null
  table_info?: { public_number: string }
  restaurant_info?: { name: string }
  start_at: string
  has_preorder?: boolean
  preorder_cooking?: boolean
  preorder_ready?: boolean
  preorder_total?: string | null
  preorder_items_count?: number
  preorder_currency?: string | null
  can_preorder?: boolean
}
