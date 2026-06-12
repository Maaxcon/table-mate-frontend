// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { MenuCategory, MenuItem } from "@/types/api/types.gen"

// ── Cart API types ─────────────────────────────────────

export type CartSessionStatus = "active" | "closed"

export type CartSession = {
  readonly public_id: string
  readonly restaurant: string
  reservation: string
  status: CartSessionStatus
  created_by: string | null
  participants: string[]
  readonly created_at: string
  readonly updated_at: string
}

export type CartItemResponse = {
  readonly public_id: string
  menu_item: string
  quantity: number
  comment: string | null
  added_by: string | null
  guest_slot: number | null
  device_id: string | null
  is_paid: boolean
  cart_session: string
  readonly restaurant: string
  readonly created_at: string
  readonly updated_at: string
}

export type AddCartItemRequest = {
  menu_item: string
  quantity: number
  comment?: string
  guest_slot?: number
}

export type UpdateCartItemRequest = {
  quantity: number
  comment?: string
  guest_slot?: number
}

export type GuestInitResponse = {
  access: string
}

export type CreateCartSessionRequest = {
  reservation: string
}
