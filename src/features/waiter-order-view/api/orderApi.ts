import { api } from "@/api/client"
import type { OrderItem, VoidReason } from "@/types/api/types.gen"
import type { MenuCategory, MenuItem } from "@/types/api/types.gen"

export type CreateOrderItem = {
  menu_item: string
  guest_slot?: number
  quantity?: number
  comment?: string | null
}

export function fetchVoidReasons(signal?: AbortSignal): Promise<VoidReason[]> {
  return api.getList<VoidReason>("/api/orders/void-reasons/", { signal })
}

export function fetchCategories(
  restaurantId?: string,
  signal?: AbortSignal,
): Promise<MenuCategory[]> {
  return api.getList<MenuCategory>("/api/menu/categories/", {
    query: { restaurant: restaurantId },
    signal,
  })
}

export function fetchMenuItems(
  {
    categoryId,
    restaurantId,
  }: {
    categoryId?: string
    restaurantId?: string
  } = {},
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  return api.getList<MenuItem>("/api/menu/items/", {
    query: { is_available: true, category: categoryId, restaurant: restaurantId },
    signal,
  })
}

export function searchMenuItems(
  query: string,
  restaurantId?: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  return api.getList<MenuItem>("/api/menu/items/search/", {
    query: { q: query, restaurant: restaurantId },
    signal,
  })
}

export function createOrderWithItems(
  session: string,
  items: CreateOrderItem[],
  signal?: AbortSignal,
): Promise<unknown> {
  return api.post("/api/orders/orders/", { session, items }, { signal })
}

export function voidOrderItem(
  itemId: string,
  voidReason: string,
  signal?: AbortSignal,
): Promise<OrderItem> {
  return api.post(
    `/api/orders/order-items/${itemId}/void/`,
    { void_reason: voidReason },
    { signal },
  )
}

export function markOrderItemServed(itemId: string, signal?: AbortSignal): Promise<OrderItem> {
  return api.patch(`/api/orders/order-items/${itemId}/`, { status: "served" }, { signal })
}
