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

export function fetchCategories(restaurantId: string): Promise<PaginatedResponse<MenuCategory>> {
  return menuGet("/api/menu/categories/", { restaurant: restaurantId, ordering: "sort_order" })
}

export type FetchItemsParams = {
  restaurantId: string
  categoryId?: string
  page?: number
}

export function fetchItems({
  restaurantId,
  categoryId,
  page,
}: FetchItemsParams): Promise<PaginatedResponse<MenuItem>> {
  return menuGet("/api/menu/items/", {
    restaurant: restaurantId,
    ordering: "sort_order",
    ...(categoryId ? { category: categoryId } : {}),
    ...(page && page > 1 ? { page: String(page) } : {}),
  })
}

export function searchItems(
  restaurantId: string,
  query: string,
): Promise<PaginatedResponse<MenuItem>> {
  return menuGet("/api/menu/items/search/", { restaurant: restaurantId, q: query })
}
