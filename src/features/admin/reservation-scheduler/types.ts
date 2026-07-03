import type { ReservationStatus } from "@/features/reservation/api"

export interface SchedulerReservation {
  public_id: string
  table: string
  table_number: string
  customer_name: string
  guest_count: number
  start_at: string
  end_at: string
  opened_at: string | null
  status: ReservationStatus
}

export interface PendingChange {
  reservation_id: string
  original_table: string
  original_table_number: string
  original_start_at: string
  original_end_at: string
  new_table_id: string
  new_table_number: string
  new_date: string
  new_start_time: string
  new_end_time: string
  customer_name: string
  guest_count: number
  opened_at: string | null
  status: string
}

export interface BatchUpdatePayload {
  changes: {
    reservation_id: string
    new_table_id: string
    new_date: string
    new_start_time: string
    new_end_time: string
  }[]
}

export interface BatchUpdateResponse {
  ok: true
}

export interface BatchUpdateErrorResponse {
  ok: false
  conflicting_reservation_id?: string
  message: string
}

export type SchedulerTable = {
  public_id: string
  public_number: string
  capacity: number
  zone?: string
  active?: boolean
}

export function isoToDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
