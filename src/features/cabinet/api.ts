import { apiFetch } from "@/api/client"
import heroImage from "@/assets/hero.png"
import i18n from "@/i18n/config"
import type { MeResponse } from "@/features/auth/types"
import type { CabinetProfile, HistoryEntry, Reservation } from "./types"

// "Active" bookings are the ones the user can still act on.
const ACTIVE_STATUSES = new Set(["pending", "active"])

// Raw receipt shape from GET /api/receipts/my/ (snake_case, decimals as strings).
type ApiReceiptItem = { name: string; quantity: number; unit_price: string }
type ApiReceipt = {
  public_id: string
  order_number: string
  restaurant_public_id: string
  restaurant_name: string
  restaurant_address: string
  restaurant_phone: string
  restaurant_image: string | null
  visited_at: string
  currency: string
  table_label: string
  server_name: string
  guests: number
  items: ApiReceiptItem[]
  subtotal: string
  tax: string
  service_charge: string
  tip: string
  total: string
  payment_method: "card" | "cash"
  payment_status: string
}

// Load the signed-in user's receipt history from the database.
export async function fetchMyReceipts(signal?: AbortSignal): Promise<HistoryEntry[]> {
  const res = await apiFetch("/api/receipts/my/", { signal })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = (await res.json()) as ApiReceipt[]
  return data.map((r) => ({
    id: r.public_id,
    orderNumber: r.order_number,
    restaurantId: r.restaurant_public_id,
    restaurantName: r.restaurant_name,
    restaurantImage: r.restaurant_image ?? heroImage,
    restaurantAddress: r.restaurant_address,
    restaurantPhone: r.restaurant_phone,
    date: r.visited_at,
    currency: r.currency,
    tableLabel: r.table_label,
    server: r.server_name,
    guests: r.guests,
    items: r.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
    })),
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    serviceCharge: Number(r.service_charge),
    tip: Number(r.tip),
    total: Number(r.total),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
  }))
}

// Load the signed-in user's profile for the cabinet header.
export async function fetchMyProfile(signal?: AbortSignal): Promise<CabinetProfile> {
  const res = await apiFetch("/api/auth/me/", { signal })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const me = (await res.json()) as MeResponse
  return {
    firstName: me.first_name,
    lastName: me.last_name,
    email: me.email,
    phone: me.phone,
    role: me.role,
    createdAt: me.created_at,
  }
}

// Fields a user may edit about themselves. Email is intentionally excluded —
// it is the Google sign-in identity and must not change here.
export type ProfileUpdate = {
  firstName?: string
  lastName?: string
  phone?: string | null
}

// Save profile changes. Returns the updated profile from the server.
export async function updateMyProfile(patch: ProfileUpdate): Promise<CabinetProfile> {
  const body: Record<string, unknown> = {}
  if (patch.firstName !== undefined) body.first_name = patch.firstName
  if (patch.lastName !== undefined) body.last_name = patch.lastName
  if (patch.phone !== undefined) body.phone = patch.phone

  const res = await apiFetch("/api/auth/me/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(await extractError(res))
  }

  const me = (await res.json()) as MeResponse
  return {
    firstName: me.first_name,
    lastName: me.last_name,
    email: me.email,
    phone: me.phone,
    role: me.role,
    createdAt: me.created_at,
  }
}

// Pull a readable message out of a DRF error body, e.g.
// { "email": ["user with this email already exists."] }.
async function extractError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const first = Object.values(data)[0]
    if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    if (typeof first === "string") return first
  } catch {
    // fall through to the generic message
  }
  return i18n.t("cabinet.errors.saveChanges")
}

export const BOOKINGS_PAGE_SIZE = 10

// Load the signed-in customer's own reservations.
type FetchMyReservationsOptions = {
  limit?: number
  offset?: number
  signal?: AbortSignal
  status?: string[]
}

type PaginatedReservationList = {
  count: number
  next: string | null
  previous: string | null
  results: Reservation[]
}

export async function fetchMyReservations(
  options: FetchMyReservationsOptions = {},
): Promise<Reservation[]> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set("limit", String(options.limit))
  if (options.offset !== undefined) params.set("offset", String(options.offset))
  if (options.status) {
    for (const s of options.status) {
      params.append("status", s)
    }
  }
  const query = params.toString()
  const res = await apiFetch(`/api/reservations/reservations/my/${query ? `?${query}` : ""}`, {
    signal: options.signal,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = (await res.json()) as PaginatedReservationList | Reservation[]
  return Array.isArray(data) ? data : (data.results ?? [])
}

// Keep only the bookings the user can still modify or cancel.
export function filterActiveBookings(reservations: Reservation[]): Reservation[] {
  return reservations.filter((r) => ACTIVE_STATUSES.has(r.status))
}

export async function cancelReservation(publicId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/reservations/${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  })
  if (!res.ok) throw new Error(await extractError(res))
}
