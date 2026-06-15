import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { firstError, type Paginated } from "@/api/client"
import { CART_API, MENU_API } from "./constants"
import type {
  AddCartItemRequest,
  CartItemResponse,
  FetchItemsParams,
  GuestInitResponse,
  MenuCategory,
  MenuItem,
  PublicRestaurant,
  ToggleLikeResponse,
  UpdateCartItemRequest,
} from "./types"

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

async function menuGet<T>(
  path: string,
  params: Record<string, string | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(buildUrl(path, params), { signal })
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

export function fetchCategories(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<Paginated<MenuCategory>> {
  return menuGet(MENU_API.categories, { restaurant: restaurantId, ordering: "sort_order" }, signal)
}

export function fetchItems({
  restaurantId,
  categoryId,
  page,
  guestToken,
  signal,
  sortOrder = "sort_order",
}: FetchItemsParams): Promise<Paginated<MenuItem>> {
  return menuGet(
    MENU_API.items,
    {
      restaurant: restaurantId,
      guest_token: guestToken,
      ordering: sortOrder,
      ...(categoryId ? { category: categoryId } : {}),
      ...(page && page > 1 ? { page: String(page) } : {}),
    },
    signal,
  )
}

export async function fetchItem(
  restaurantId: string,
  itemPublicId: string,
  guestToken?: string,
  signal?: AbortSignal,
): Promise<MenuItem | null> {
  const res = await fetch(
    buildUrl(MENU_API.item(itemPublicId), {
      restaurant: restaurantId,
      guest_token: guestToken,
    }),
    { signal },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<MenuItem>
}

export function searchItems(
  restaurantId: string,
  query: string,
  guestToken?: string,
  signal?: AbortSignal,
  page?: number,
): Promise<Paginated<MenuItem>> {
  return menuGet(
    MENU_API.itemsSearch,
    {
      restaurant: restaurantId,
      q: query,
      guest_token: guestToken,
      ...(page && page > 1 ? { page: String(page) } : {}),
    },
    signal,
  )
}

export function toggleItemLike(
  restaurantId: string,
  itemPublicId: string,
  guestToken: string,
): Promise<ToggleLikeResponse> {
  return menuPost(
    MENU_API.toggleLike(itemPublicId),
    { restaurant: restaurantId },
    {
      guest_token: guestToken,
    },
  )
}

export function fetchRestaurant(restaurantId: string): Promise<PublicRestaurant> {
  return menuGet(MENU_API.restaurantPublic(restaurantId), {})
}

// ── Cart API ────────────────────────────────────────────

async function authFetch<T>(
  path: string,
  jwt: string,
  init?: RequestInit & { query?: Record<string, string | undefined> },
): Promise<T> {
  if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
    throw new Error("VITE_API_BASE_URL is not configured")
  }
  let url = `${env.apiBaseUrl}${path}`
  if (init?.query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined) qs.set(k, v)
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
  }
  if (init?.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const detail = await firstError(res as unknown as Response, res.statusText)
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function guestInit(deviceId: string, reservationId: string): Promise<GuestInitResponse> {
  if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
    throw new Error("VITE_API_BASE_URL is not configured")
  }
  return fetch(`${env.apiBaseUrl}${CART_API.guestInit}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, reservation_id: reservationId }),
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("NO_ACTIVE_SESSION")
      }
      const detail = await firstError(res as unknown as Response, res.statusText)
      throw new Error(detail)
    }
    return res.json() as Promise<GuestInitResponse>
  })
}

export function fetchCartItems(sessionId: string, jwt: string): Promise<CartItemResponse[]> {
  return authFetch<{ count: number; results: CartItemResponse[] }>(
    CART_API.items(sessionId),
    jwt,
  ).then((r) => r.results)
}

export function addCartItem(
  sessionId: string,
  body: AddCartItemRequest,
  jwt: string,
): Promise<CartItemResponse> {
  return authFetch<CartItemResponse>(CART_API.items(sessionId), jwt, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateCartItem(
  sessionId: string,
  itemId: string,
  body: UpdateCartItemRequest,
  jwt: string,
): Promise<CartItemResponse> {
  return authFetch<CartItemResponse>(CART_API.item(sessionId, itemId), jwt, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function deleteCartItem(sessionId: string, itemId: string, jwt: string): Promise<void> {
  return authFetch<void>(CART_API.item(sessionId, itemId), jwt, {
    method: "DELETE",
  })
}
