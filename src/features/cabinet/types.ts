import type { UserRole } from "@/features/auth/types"

// Profile shown in the cabinet header. Built from GET /api/auth/me/.
export type CabinetProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: UserRole
  // ISO date string of when the account was created — used for "Member since YYYY".
  createdAt: string
}

// Reservation statuses returned by the backend.
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed"

// One reservation from GET /api/reservations/reservations/my/.
export type Reservation = {
  public_id: string
  table: string | null
  guest_count: number
  start_at: string
  end_at: string
  status: ReservationStatus
  notes: string | null
}

// One past visit shown in the History list.
// NOTE: there is no customer order-history endpoint yet, so this is filled
// with seeded mock data for now. The shape mirrors the future Order payload.
export type HistoryEntry = {
  id: string
  restaurantName: string
  // ISO date string of the visit.
  date: string
  // Total bill as a number in the smallest sensible unit (major currency units).
  total: number
  currency: string
  itemCount: number
}
