import { apiFetch } from "@/api/client"
import heroImage from "@/assets/hero.png"
import type { MeResponse } from "@/features/auth/types"
import type { CabinetProfile, HistoryEntry, Reservation } from "./types"

// "Active" bookings are the ones the user can still act on.
const ACTIVE_STATUSES = new Set(["pending", "confirmed"])

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

// Fields a user may edit about themselves.
export type ProfileUpdate = {
  firstName?: string
  lastName?: string
  phone?: string | null
  email?: string
}

// Save profile changes. Returns the updated profile from the server.
export async function updateMyProfile(patch: ProfileUpdate): Promise<CabinetProfile> {
  const body: Record<string, unknown> = {}
  if (patch.firstName !== undefined) body.first_name = patch.firstName
  if (patch.lastName !== undefined) body.last_name = patch.lastName
  if (patch.phone !== undefined) body.phone = patch.phone
  if (patch.email !== undefined) body.email = patch.email

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
  return "Could not save changes. Please try again."
}

// Load the signed-in customer's own reservations.
export async function fetchMyReservations(signal?: AbortSignal): Promise<Reservation[]> {
  const res = await apiFetch("/api/reservations/reservations/my/", { signal })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as Reservation[]
}

// Keep only the bookings the user can still modify or cancel.
export function filterActiveBookings(reservations: Reservation[]): Reservation[] {
  return reservations.filter((r) => ACTIVE_STATUSES.has(r.status))
}

// Cancel a booking.
// TODO(backend): there is no customer cancel endpoint yet (reservation `status`
// is read-only in the serializer). When it exists, call it here, e.g.
//   await apiFetch(`/api/reservations/reservations/${publicId}/cancel/`, { method: "POST" })
// For now this is a no-op so the UI can update its local state optimistically.
export async function cancelReservation(publicId: string): Promise<void> {
  void publicId
  return Promise.resolve()
}
