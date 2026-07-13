import { apiFetch, firstError } from "@/api/client"

/** Fetches the PNG QR code for a table, scoped to the caller's own restaurant. */
export async function fetchTableQrCode(tablePublicId: string): Promise<Blob> {
  const res = await apiFetch(`/api/restaurants/tables/${tablePublicId}/qr/`)
  if (!res.ok) throw new Error(await firstError(res, "Could not load the QR code."))
  return res.blob()
}
