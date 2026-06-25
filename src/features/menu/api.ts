import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { apiFetch, getAccessToken, type Paginated } from "@/api/client"
import { CART_CLIENT_ID } from "./clientId"
import { CART_API, MENU_API } from "./constants"
import type {
  AddCartItemRequest,
  CartItemResponse,
  CheckoutResponse,
  FetchItemsParams,
  GuestInitResponse,
  GuestInitTarget,
  MenuCategory,
  MenuItem,
  PublicRestaurant,
  SortOrder,
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
  sortOrder: SortOrder = "sort_order",
): Promise<Paginated<MenuItem>> {
  return menuGet(
    MENU_API.itemsSearch,
    {
      restaurant: restaurantId,
      q: query,
      guest_token: guestToken,
      ordering: sortOrder,
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
        const body = (await res.json().catch(() => null)) as {
          code?: string
          start_at?: string | null
        } | null
        if (body?.code === "RESERVATION_NOT_YET_ACTIVE") {
          throw new ReservationNotYetActiveError(body.start_at ?? null)
        }
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
  // Only a logged-in customer can have a booking to activate. For an anonymous
  // guest there's no token, and routing this through apiFetch would 401 → failed
  // refresh → clearAuth on every scan. Skip it; guest-init opens the cart anyway.
  if (!getAccessToken()) return
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
// Mirrors the server breakdown so the receipt can reconcile
// (subtotal + tax + service = total). Currency is sourced from restaurant
// settings in the UI, so it isn't carried here.
export type CheckoutResult = {
  orderId: string
  subtotal: string
  tax: string
  serviceCharge: string
  total: string
}

export class CartChangedError extends Error {
  removed: RemovedItem[]
  constructor(removed: RemovedItem[]) {
    super("CART_CHANGED")
    this.name = "CartChangedError"
    this.removed = removed
  }
}

// The table has a pending booking that has not started yet. Carries the booking
// start time (ISO) so we can tell the guest when the table opens.
export class ReservationNotYetActiveError extends Error {
  startAt: string | null
  constructor(startAt: string | null) {
    super("RESERVATION_NOT_YET_ACTIVE")
    this.name = "ReservationNotYetActiveError"
    this.startAt = startAt
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
      // Shape tied to the generated schema type so it can't drift from the API.
      const body = (await res.json().catch(() => null)) as Partial<CheckoutResponse> | null
      if (!body?.order_id) {
        throw new Error("Checkout succeeded but the response was malformed.")
      }
      return {
        orderId: body.order_id,
        subtotal: body.subtotal ?? "",
        tax: body.tax ?? "",
        serviceCharge: body.service_charge ?? "",
        total: body.total ?? "",
      }
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

// One line of the bill — an already-ordered item across the table's visit.
export type BillItem = {
  id: string
  name: string
  guest_slot: number
  quantity: number
  // The amount owed for this line: goods + tax + its share of service charge.
  // Summing it reconciles with the checkout receipt total. (The goods-only
  // total_price is intentionally not part of the bill response.)
  payable: string
  is_paid: boolean
}

// The bill: items already submitted to the kitchen for this table's visit.
export function fetchBill(sessionId: string, jwt: string): Promise<BillItem[]> {
  return authFetch<BillItem[]>(CART_API.bill(sessionId), jwt)
}

// Simulated payment: marks the selected ordered items as paid (no money moves).
// Returns the updated bill.
export function payOrderItems(
  sessionId: string,
  orderItemIds: string[],
  jwt: string,
): Promise<BillItem[]> {
  return authFetch<BillItem[]>(CART_API.pay(sessionId), jwt, {
    method: "POST",
    body: JSON.stringify({ order_item_ids: orderItemIds }),
  })
}
