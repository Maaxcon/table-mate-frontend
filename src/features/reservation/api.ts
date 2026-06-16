import { apiFetch } from "@/api/client"
import type { Table } from "@/types/api/types.gen"
import type { UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"

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

export async function checkAvailability(
  startAt: string,
  endAt: string,
  guestCount?: number,
  restaurantId?: string,
): Promise<Table[]> {
  const params = new URLSearchParams({ start_at: startAt, end_at: endAt })
  if (guestCount !== undefined) params.set("guest_count", String(guestCount))
  if (restaurantId) params.set("restaurant", restaurantId)
  const res = await apiFetch(`/api/editor/tables/available/?${params}`)
  if (!res.ok) throw new Error("Failed to check availability")
  const data = await res.json()
  return data.results ?? data
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
    const detail = (body as { detail?: string | Record<string, string[]> }).detail
    const message = typeof detail === "string" ? detail : JSON.stringify(detail ?? body)
    throw new Error(message ?? "Failed to create reservation")
  }
  return res.json() as Promise<ReservationWithTable>
}

export async function fetchMyReservations(restaurantId?: string): Promise<ReservationWithTable[]> {
  let url = "/api/reservations/reservations/my/"
  if (restaurantId) {
    url += `?restaurant=${restaurantId}`
  }
  const res = await apiFetch(url)
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

export async function createStaffReservation(data: {
  table: string
  guest_count: number
  start_at: string
  end_at: string
  guest_name: string
  guest_phone?: string
  notes?: string
}): Promise<ReservationWithTable> {
  const res = await apiFetch("/api/reservations/reservations/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as { detail?: string | Record<string, string[]> }).detail
    const message = typeof detail === "string" ? detail : JSON.stringify(detail ?? body)
    throw new Error(message ?? "Failed to create reservation")
  }
  return res.json() as Promise<ReservationWithTable>
}

export async function moveTable(reservationId: string, tableId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/reservations/${reservationId}/move-table/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table_id: tableId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? "Failed to move table")
  }
}

export async function closeCheck(reservationId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/reservations/${reservationId}/close-check/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? "Failed to close check")
  }
}
