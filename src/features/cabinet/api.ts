import { apiFetch } from "@/api/client"
import type { MeResponse } from "@/features/auth/types"
import type { CabinetProfile, Reservation } from "./types"

// "Active" bookings are the ones the user can still act on.
const ACTIVE_STATUSES = new Set(["pending", "confirmed"])

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
