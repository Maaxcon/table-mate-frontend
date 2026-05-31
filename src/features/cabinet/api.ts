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
