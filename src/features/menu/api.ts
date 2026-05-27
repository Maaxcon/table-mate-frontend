import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import type { MenuCategory, MenuItem, PaginatedResponse } from "@/types/menu"

function buildUrl(path: string, params: Record<string, string | undefined>): string {
  if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
    throw new Error("VITE_API_BASE_URL is not configured")
  }
  const url = new URL(`${env.apiBaseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value)
  }
  return url.toString()
}

async function menuGet<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params))
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

async function menuPost<T>(
  path: string,
  params: Record<string, string | undefined>,
  body: Record<string, string>,
): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export function fetchCategories(restaurantId: string): Promise<PaginatedResponse<MenuCategory>> {
  return menuGet("/api/menu/categories/", { restaurant: restaurantId, ordering: "sort_order" })
}

export type FetchItemsParams = {
  restaurantId: string
  categoryId?: string
  page?: number
  guestToken?: string
}

export function fetchItems({
  restaurantId,
  categoryId,
  page,
  guestToken,
}: FetchItemsParams): Promise<PaginatedResponse<MenuItem>> {
  return menuGet("/api/menu/items/", {
    restaurant: restaurantId,
    guest_token: guestToken,
    ordering: "sort_order",
    ...(categoryId ? { category: categoryId } : {}),
    ...(page && page > 1 ? { page: String(page) } : {}),
  })
}

export function searchItems(
  restaurantId: string,
  query: string,
  guestToken?: string,
): Promise<PaginatedResponse<MenuItem>> {
  return menuGet("/api/menu/items/search/", {
    restaurant: restaurantId,
    q: query,
    guest_token: guestToken,
  })
}

export type ToggleLikeResponse = {
  public_id: string
  is_liked: boolean
  likes_count: number
}

export function toggleItemLike(
  restaurantId: string,
  itemPublicId: string,
  guestToken: string,
): Promise<ToggleLikeResponse> {
  return menuPost(
    `/api/menu/items/${itemPublicId}/toggle-like/`,
    { restaurant: restaurantId },
    {
      guest_token: guestToken,
    },
  )
}

export type WorkingHoursDay = { open: string; close: string }
export type WorkingHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", WorkingHoursDay>
>

export type PublicRestaurantSettings = {
  currency: string
  timezone: string
  working_hours: WorkingHours
  rating: string
  eta_min_minutes: number
  eta_max_minutes: number
  price_band: number
}

export type PublicRestaurant = {
  public_id: string
  name: string
  address: string
  phone: string
  settings: PublicRestaurantSettings | null
}

export function fetchRestaurant(restaurantId: string): Promise<PublicRestaurant> {
  return menuGet(`/api/restaurants/restaurants-public/${restaurantId}/`, {})
}
