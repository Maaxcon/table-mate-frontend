import type { WorkingHours } from "@/types/workingHours"

// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { CheckoutResponse, MenuCategory, MenuItem } from "@/types/api/types.gen"

// Re-exported so menu consumers import working-hours types from one place.
export type { WorkingHours, WorkingHoursDay } from "@/types/workingHours"

// ── Menu list / query types ────────────────────────────

export type SortOrder = "sort_order" | "price" | "-price"

export type FetchItemsParams = {
  restaurantId: string
  categoryId?: string
  page?: number
  guestToken?: string
  signal?: AbortSignal
  sortOrder?: SortOrder
}

export type ToggleLikeResponse = {
  public_id: string
  is_liked: boolean
  likes_count: number
}

// ── Public restaurant types ────────────────────────────

export type PublicRestaurantSettings = {
  currency: string
  timezone: string
  working_hours: WorkingHours
  rating: string | null
  eta_min_minutes: number
  eta_max_minutes: number
  price_band: number
}

export type PublicRestaurant = {
  public_id: string
  name: string
  address: string
  phone: string
  cover_image: string | null
  telegram_url: string
  facebook_url: string
  settings: PublicRestaurantSettings | null
}

// ── Cart API types ─────────────────────────────────────

// A self-contained snapshot of the ordered menu item, so a cart line can render
// without the menu item being present in the currently browsed/sorted list.
export type CartMenuItemSnapshot = {
  id: string
  name: string
  price: string
  image: string | null
  is_available: boolean
}

export type CartItemResponse = {
  readonly public_id: string
  menu_item: string
  menu_item_detail?: CartMenuItemSnapshot
  quantity: number
  comment: string | null
  added_by: string | null
  guest_slot: number | null
  is_mine: boolean
  is_paid: boolean
  display_name: string | null
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
  // Whether the reservation behind this cart hasn't started yet — set by
  // the backend from the session's own reservation, not inferred from
  // which lookup found it (a cart reused from an earlier pre-order round
  // is found via the active-cart lookup, not the not-yet-active fallback).
  is_preorder?: boolean
}

export type GuestInitTarget = {
  reservationId?: string | null
  tableId?: string | null
}
