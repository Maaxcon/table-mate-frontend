import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { apiFetch, type Paginated } from "@/api/client"
import { CART_CLIENT_ID } from "./clientId"
import { CART_API, MENU_API } from "./constants"
import type {
  AddCartItemRequest,
  CartItemResponse,
  FetchItemsParams,
  GuestInitResponse,
  GuestInitTarget,
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

export type ApiError = Error & { code?: string; status?: number }

async function httpError(res: Response): Promise<ApiError> {
  let message = res.statusText
  let code: string | undefined
  try {
    const data = (await res.json()) as Record<string, unknown>
    if (typeof data.code === "string") code = data.code
    if (typeof data.detail === "string") {
      message = data.detail
    } else {
      const first = Object.values(data)[0]
      if (Array.isArray(first) && typeof first[0] === "string") message = first[0]
      else if (typeof first === "string") message = first
    }
  } catch {
    // ignore
  }
  const err = new Error(message) as ApiError
  err.code = code
  err.status = res.status
  return err
}

async function menuGet<T>(
  path: string,
  params: Record<string, string | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(buildUrl(path, params), { signal })
  if (!res.ok) throw await httpError(res)
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
  if (!res.ok) throw await httpError(res)
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
  if (!res.ok) throw await httpError(res)
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
  const { query, ...rest } = init ?? {}
  const url = buildUrl(path, query ?? {})
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    "X-Client-Id": CART_CLIENT_ID,
  }
  if (rest.body && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(url, { ...rest, headers })
  if (!res.ok) {
    throw await httpError(res)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function guestInit(
  target: GuestInitTarget,
  currentJwt?: string | null,
): Promise<GuestInitResponse> {
  if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
    throw new Error("VITE_API_BASE_URL is not configured")
  }
  const body: Record<string, string> = {}
  if (target.reservationId) body.reservation_id = target.reservationId
  if (target.tableId) body.table_id = target.tableId
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (currentJwt) headers.Authorization = `Bearer ${currentJwt}`
  return fetch(`${env.apiBaseUrl}${CART_API.guestInit}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 404) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null
        throw new Error(
          body?.code === "NO_ACTIVE_RESERVATION" ? "NO_ACTIVE_RESERVATION" : "NO_ACTIVE_SESSION",
        )
      }
      throw await httpError(res)
    }
    return res.json() as Promise<GuestInitResponse>
  })
}

// Best-effort: tell the backend a guest is at this table so a pending booking
// owned by the logged-in customer flips to active before we open the cart.
// Silent on failure (guest not logged in / not the owner) — guest-init follows.
export async function verifyScan(tableId: string): Promise<void> {
  try {
    await apiFetch(CART_API.verifyScan, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: tableId }),
    })
  } catch {
    // ignore — activation is optional; cart opening proceeds regardless
  }
}

export type RemovedItem = { id: string; name: string }
export type CheckoutResult = { orderId: string; total: string }

export class CartChangedError extends Error {
  removed: RemovedItem[]
  constructor(removed: RemovedItem[]) {
    super("CART_CHANGED")
    this.name = "CartChangedError"
    this.removed = removed
  }
}

export function checkout(sessionId: string, jwt: string): Promise<CheckoutResult> {
  if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
    throw new Error("VITE_API_BASE_URL is not configured")
  }
  return fetch(`${env.apiBaseUrl}${CART_API.checkout(sessionId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  }).then(async (res) => {
    if (res.status === 201) {
      const body = (await res.json().catch(() => null)) as {
        order_id?: string
        total?: string
      } | null
      if (!body?.order_id) {
        throw new Error("Checkout succeeded but the response was malformed.")
      }
      return { orderId: body.order_id, total: body.total ?? "" }
    }
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as {
        code?: string
        removed?: RemovedItem[]
      } | null
      if (body?.code === "CART_CHANGED") {
        throw new CartChangedError(body.removed ?? [])
      }
    }
    throw await httpError(res)
  })
}

const MAX_CART_PAGES = 100

export async function fetchCartItems(sessionId: string, jwt: string): Promise<CartItemResponse[]> {
  const all: CartItemResponse[] = []
  for (let page = 1; page <= MAX_CART_PAGES; page += 1) {
    const data = await authFetch<{ next: string | null; results: CartItemResponse[] }>(
      CART_API.items(sessionId),
      jwt,
      { query: { page: String(page) } },
    )
    all.push(...data.results)
    if (!data.next) break
  }
  return all
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
