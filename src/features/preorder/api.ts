import { apiFetch } from "@/api/client"
import i18n from "@/i18n/config"
import type { PreorderDetail } from "@/types/api"
import type { Preorder } from "./types"

function toPreorder(data: PreorderDetail): Preorder {
  return {
    orderId: data.order_id,
    currency: data.currency,
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    serviceCharge: Number(data.service_charge),
    total: Number(data.total),
    isCooking: data.is_cooking,
    canCancel: data.can_cancel,
    canAddMore: data.can_add_more,
    items: data.items.map((i) => ({
      id: i.public_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
    })),
  }
}

// The failure body carries the code the UI translates off; the message is only
// a fallback for a code we have no string for.
async function preorderError(res: Response): Promise<Error> {
  let message = res.statusText
  let code: string | undefined
  try {
    const body = (await res.clone().json()) as { detail?: string; code?: string }
    if (body.detail) message = body.detail
    if (body.code) code = body.code
  } catch {
    // fall through — an uncoded failure translates to the caller's fallback
  }
  return Object.assign(new Error(message || i18n.t("cabinet.errors.saveChanges")), { code })
}

// The booking's current paid pre-order, or null if it doesn't have one (204).
export async function fetchPreorder(
  reservationId: string,
  signal?: AbortSignal,
): Promise<Preorder | null> {
  const res = await apiFetch(
    `/api/reservations/reservations/${reservationId}/preorder/`,
    signal ? { signal } : undefined,
  )
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return toPreorder((await res.json()) as PreorderDetail)
}

// Drop one dish off the pre-order (simulated refund for that dish). Returns
// the updated check, or null when it was the last dish and the whole round
// went with it (204).
export async function cancelPreorderItem(
  reservationId: string,
  itemId: string,
): Promise<Preorder | null> {
  const res = await apiFetch(
    `/api/reservations/reservations/${reservationId}/preorder/items/${itemId}/`,
    { method: "DELETE" },
  )
  if (res.status === 204) return null
  if (!res.ok) throw await preorderError(res)
  return toPreorder((await res.json()) as PreorderDetail)
}

// Cancel every paid round (simulated refund). Only works while the kitchen
// hasn't started it yet — the backend 409s otherwise.
export async function cancelPreorder(reservationId: string): Promise<void> {
  const res = await apiFetch(`/api/reservations/reservations/${reservationId}/preorder/`, {
    method: "DELETE",
  })
  if (!res.ok) throw await preorderError(res)
}
