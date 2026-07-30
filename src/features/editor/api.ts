import { apiFetch, firstError } from "@/api/client"
import type { LayoutPayload } from "./types"

/** Fetches the PNG QR code for a table, scoped to the caller's own restaurant. */
export async function fetchTableQrCode(tablePublicId: string): Promise<Blob> {
  const res = await apiFetch(`/api/restaurants/tables/${tablePublicId}/qr/`)
  if (!res.ok) throw new Error(await firstError(res, "Could not load the QR code."))
  return res.blob()
}

export interface DraftResponse {
  draft_json: LayoutPayload | null
  updated_at: string | null
  updated_by: string | null
}

/** Load the current draft (or latest published if no draft). */
export async function fetchDraft(): Promise<DraftResponse> {
  const res = await apiFetch("/api/editor/layouts/draft/")
  if (!res.ok) throw new Error(await firstError(res, "Failed to load draft."))
  return res.json()
}

/** Save a draft (validates same schema as publish, no Table/Zone side effects). */
export async function saveDraft(body: Record<string, unknown>): Promise<DraftResponse> {
  const res = await apiFetch("/api/editor/layouts/draft/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await firstError(res, "Failed to save draft."))
  return res.json()
}

/** Discard the current draft. */
export async function deleteDraft(): Promise<void> {
  const res = await apiFetch("/api/editor/layouts/draft/", { method: "DELETE" })
  if (!res.ok) throw new Error(await firstError(res, "Failed to delete draft."))
}
