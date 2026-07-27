import { api } from "@/api/client"
import { fetchRestaurantSettings } from "@/features/reservation/api"
import type { ShiftSchedulerShift, ShiftWritePayload, ShiftCopyPayload } from "./types"

export async function fetchWorkingHours(
  restaurantId: string,
): Promise<Record<string, { open: string; close: string }>> {
  const settings = await fetchRestaurantSettings(restaurantId)
  return settings.working_hours ?? {}
}

const SHIFTS_PATH = "/api/shifts/"

export function fetchShifts(params: {
  date?: string
  date_from?: string
  date_to?: string
  employee_id?: string
}): Promise<ShiftSchedulerShift[]> {
  const query: Record<string, string> = {}
  if (params.date) query.date = params.date
  if (params.date_from) query.date_from = params.date_from
  if (params.date_to) query.date_to = params.date_to
  if (params.employee_id) query.employee_id = params.employee_id
  return api.getList<ShiftSchedulerShift>(SHIFTS_PATH, { query })
}

export function createShift(payload: ShiftWritePayload): Promise<ShiftSchedulerShift> {
  return api.post<ShiftSchedulerShift>(SHIFTS_PATH, payload, {
    errorMessage: "Could not create shift.",
  })
}

export function updateShift(
  publicId: string,
  payload: Partial<ShiftWritePayload>,
): Promise<ShiftSchedulerShift> {
  return api.patch<ShiftSchedulerShift>(`${SHIFTS_PATH}${publicId}/`, payload, {
    errorMessage: "Could not update shift.",
  })
}

export function deleteShift(publicId: string): Promise<void> {
  return api.del(`${SHIFTS_PATH}${publicId}/`)
}

export function copyShifts(payload: ShiftCopyPayload): Promise<{ copied: number }> {
  return api.post<{ copied: number }>(`${SHIFTS_PATH}copy/`, payload, {
    errorMessage: "Could not copy shifts.",
  })
}
