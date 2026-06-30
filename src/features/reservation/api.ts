import { apiFetch } from "@/api/client"
import type { Table } from "@/types/api/types.gen"
import type { UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { DEFAULT_DURATION } from "./utils"

// Turns a DRF error body into a human message: a string `detail`, otherwise the
// first field error, falling back to a generic message — never raw JSON.
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === "string") return detail
    const firstValue = Object.values(body as Record<string, unknown>).find(Boolean)
    if (typeof firstValue === "string") return firstValue
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0]
  }
  return fallback
}

export type WorkingHoursDay = {
  open: string
  close: string
}

export type RestaurantSettingsData = {
  public_id: string
  timezone: string
  currency: string
  working_hours: Record<string, WorkingHoursDay> | null
}

export type ReservationStatus = "pending" | "active" | "completed" | "cancelled"

export type ReservationWithTable = {
  public_id: string
  restaurant: string
  customer: string | null
  table: string
  table_info?: {
    public_id: string
    table_number: string
    capacity: number
    shape: string
  }
  guest_count: number
  start_at: string
  end_at: string
  status: ReservationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Zone = {
  public_id: string
  name: string
  sort_order: number
}

export async function fetchZones(restaurantId?: string): Promise<Zone[]> {
  let url = "/api/restaurants/zones/"
  if (restaurantId) {
    url += `?restaurant=${restaurantId}`
  }
  const res = await apiFetch(url)
  if (!res.ok) throw new Error("Failed to fetch zones")
  const data = await res.json()
  return data.results ?? data
}

export async function fetchTables(restaurantId?: string): Promise<Table[]> {
  let url = "/api/restaurants/tables/"
  if (restaurantId) {
    url += `?restaurant=${restaurantId}`
  }
  const res = await apiFetch(url)
  if (!res.ok) throw new Error("Failed to fetch tables")
  const data = await res.json()
  return data.results ?? data
}

export async function fetchRestaurantSettings(
  restaurantId?: string,
): Promise<RestaurantSettingsData> {
  let url = "/api/restaurants/restaurant-settings/"
  if (restaurantId) {
    url += `?restaurant=${restaurantId}`
  }
  const res = await apiFetch(url)
  if (!res.ok) throw new Error("Failed to fetch settings")
  const data = await res.json()
  const results = data.results ?? data
  return Array.isArray(results) ? results[0] : results
}

export async function fetchAvailableSlots(
  tableId: string,
  date?: string,
  exclude?: string | string[],
): Promise<Record<string, string[]>> {
  const params = new URLSearchParams({ table: tableId })
  if (date) params.set("date", date)
  if (exclude) {
    const ids = Array.isArray(exclude) ? exclude : [exclude]
    for (const id of ids) {
      params.append("exclude", id)
    }
  }
  const res = await apiFetch(`/api/reservations/reservations/available-slots/?${params}`)
  if (!res.ok) throw new Error("Failed to fetch available slots")
  return res.json() as Promise<Record<string, string[]>>
}

// Per-table availability for one slot (date + time + duration) across the whole
// restaurant — one request powering the time-aware floor plan. Returns a map of
// table public_id -> is the table free for that slot.
export async function fetchSlotAvailability(
  restaurantId: string,
  date: string,
  time: string,
  duration = DEFAULT_DURATION,
): Promise<Record<string, boolean>> {
  const params = new URLSearchParams({
    restaurant: restaurantId,
    date,
    time,
    duration: String(duration),
  })
  const res = await apiFetch(`/api/reservations/reservations/availability/?${params}`)
  if (!res.ok) throw new Error("Failed to fetch availability")
  const data = (await res.json()) as { availability?: Record<string, boolean> }
  return data.availability ?? {}
}

// There is no dedicated public endpoint for upcoming reservations yet, so we
// piggyback on the floor-layout payload and pull the field out. Worth a proper
// endpoint if the badges ever need their own filtering/pagination.
export async function fetchUpcomingReservations(
  restaurantId?: string,
): Promise<UpcomingReservation[]> {
  let url = "/api/restaurants/tables/layout/"
  if (restaurantId) {
    url += `?restaurant=${restaurantId}`
  }
  const res = await apiFetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { upcoming_reservations?: UpcomingReservation[] }
  return data.upcoming_reservations ?? []
}

export async function createReservation(data: {
  table: string
  guest_count: number
  start_at: string
  end_at: string
  notes?: string
}): Promise<ReservationWithTable> {
  const res = await apiFetch("/api/reservations/reservations/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(body, "Failed to create reservation"))
  }
  return res.json() as Promise<ReservationWithTable>
}

export async function fetchMyReservations(
  restaurantId?: string,
  status?: "past",
): Promise<ReservationWithTable[]> {
  const params = new URLSearchParams()
  if (restaurantId) params.set("restaurant", restaurantId)
  if (status) params.set("status", status)
  const qs = params.toString()
  const res = await apiFetch(`/api/reservations/reservations/my/${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to fetch reservations")
  const data = await res.json()
  return data.results ?? data
}

export async function cancelReservation(publicId: string): Promise<ReservationWithTable> {
  const res = await apiFetch(`/api/reservations/reservations/${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? "Failed to cancel reservation")
  }
  return res.json() as Promise<ReservationWithTable>
}

export async function modifyReservation(
  publicId: string,
  data: {
    start_at?: string
    end_at?: string
    guest_count?: number
  },
): Promise<ReservationWithTable> {
  const res = await apiFetch(`/api/reservations/reservations/${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? "Failed to modify reservation")
  }
  return res.json() as Promise<ReservationWithTable>
}
