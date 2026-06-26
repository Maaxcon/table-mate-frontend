import { apiFetch } from "@/api/client"
import type {
  BatchUpdateErrorResponse,
  BatchUpdatePayload,
  BatchUpdateResponse,
  SchedulerReservation,
} from "./types"

export async function fetchReservationsForRange(
  restaurantId: string,
  dateFrom: string,
  dateTo: string,
): Promise<SchedulerReservation[]> {
  const params = new URLSearchParams({
    start_at__date__gte: dateFrom,
    start_at__date__lte: dateTo,
    status__in: "pending,active",
    ordering: "start_at",
  })
  const res = await apiFetch(`/api/reservations/reservations/?${params}`)
  if (!res.ok) throw new Error("Failed to fetch reservations")
  const data = await res.json()
  const results: unknown[] = data.results ?? data
  return results.map((r: Record<string, unknown>) => ({
    public_id: r.public_id as string,
    table: r.table as string,
    table_number: (r.table_info as Record<string, string>)?.public_number ?? "",
    customer_name: (r.customer_name as string) ?? "Guest",
    guest_count: r.guest_count as number,
    start_at: r.start_at as string,
    end_at: r.end_at as string,
    status: r.status as SchedulerReservation["status"],
  }))
}

export async function batchUpdateReservations(
  payload: BatchUpdatePayload,
): Promise<BatchUpdateResponse | BatchUpdateErrorResponse> {
  const res = await apiFetch("/api/reservations/reservations/batch-update/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (res.ok) return { ok: true }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: false,
    conflicting_reservation_id: body.conflicting_reservation_id as string | undefined,
    message: (body.detail as string) ?? "Batch update failed",
  }
}
