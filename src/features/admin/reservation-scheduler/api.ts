import { apiFetch } from "@/api/client"
import type {
  BatchUpdateErrorResponse,
  BatchUpdatePayload,
  BatchUpdateResponse,
  SchedulerReservation,
} from "./types"

interface ApiReservation {
  public_id: string
  table: string
  session_table?: string
  table_info?: { public_number: string }
  session_table_number?: string
  customer_name?: string
  guest_count: number
  start_at: string
  end_at: string
  session_ends_at?: string
  opened_at?: string | null
  status: string
}

export async function fetchReservationsForRange(
  dateFrom: string,
  dateTo: string,
): Promise<SchedulerReservation[]> {
  const params = new URLSearchParams({
    start_at__date__gte: dateFrom,
    start_at__date__lte: dateTo,
    status__in: "pending,active,completed",
    ordering: "start_at",
  })

  let allResults: SchedulerReservation[] = []
  let url: string | null = `/api/reservations/reservations/?${params}`

  while (url) {
    const res = await apiFetch(url)
    if (!res.ok) throw new Error("Failed to fetch reservations")
    const data = await res.json()
    const results: ApiReservation[] = data.results ?? data
    const mapped = results.map((r) => {
      const isActive = r.status === "active"
      return {
        public_id: r.public_id,
        table: isActive && r.session_table ? r.session_table : r.table,
        table_number:
          isActive && r.session_table_number
            ? r.session_table_number
            : (r.table_info?.public_number ?? ""),
        customer_name: r.customer_name ?? "Guest",
        guest_count: r.guest_count,
        start_at: r.start_at,
        end_at: isActive && r.session_ends_at ? r.session_ends_at : r.end_at,
        opened_at: r.opened_at ?? null,
        status: r.status as SchedulerReservation["status"],
      }
    })
    allResults = allResults.concat(mapped)
    url = data.next ?? null
  }

  return allResults
}

export async function batchUpdateReservations(
  payload: BatchUpdatePayload,
): Promise<BatchUpdateResponse | BatchUpdateErrorResponse> {
  const requestBody: Record<string, unknown> = {
    changes: payload.changes,
  }
  if (payload.cancellations && payload.cancellations.length > 0) {
    requestBody.cancellations = payload.cancellations
  }
  const res = await apiFetch("/api/reservations/reservations/batch-update/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  })
  if (res.ok) return { ok: true }
  const errBody: unknown = await res.json().catch(() => ({}))
  if (Array.isArray(errBody)) {
    return { ok: false, message: errBody.join("; ") }
  }
  if (typeof errBody === "object" && errBody !== null) {
    const obj = errBody as Record<string, unknown>
    if (Array.isArray(obj.changes)) {
      const msgs = (obj.changes as { message?: string }[])
        .filter((c) => c.message)
        .map((c) => c.message)
      if (msgs.length > 0) return { ok: false, message: msgs.join("; ") }
    }
    return {
      ok: false,
      conflicting_reservation_id: obj.conflicting_reservation_id as string | undefined,
      message: (obj.detail as string) ?? "Batch update failed",
    }
  }
  return { ok: false, message: "Batch update failed" }
}
