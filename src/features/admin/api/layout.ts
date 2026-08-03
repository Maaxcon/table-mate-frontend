import { api } from "@/api/client"
import type { LayoutPayload } from "@/features/editor/types"
import type {
  AdminFloorZone,
  LayoutEntityTranslation,
  TableTranslation,
} from "@/features/admin/types"

const EDITOR_LAYOUTS_PATH = "/api/editor/layouts/"
const TABLES_PATH = "/api/restaurants/tables/"
const ZONES_PATH = "/api/restaurants/zones/"

export async function fetchLatestLayout(signal?: AbortSignal): Promise<LayoutPayload | null> {
  const data = await api.get<{ layout_json: LayoutPayload | null }>(
    `${EDITOR_LAYOUTS_PATH}latest/`,
    { signal, errorMessage: "Could not load the latest floor plan." },
  )
  return data.layout_json ?? null
}

export function fetchEntityTranslations(signal?: AbortSignal): Promise<LayoutEntityTranslation[]> {
  return api.getList<LayoutEntityTranslation>(`${EDITOR_LAYOUTS_PATH}entity-translations/`, {
    signal,
    errorMessage: "Could not load floor plan translations.",
  })
}

export function createEntityTranslation(data: {
  entity_id: string
  language_code: string
  label: string
}): Promise<LayoutEntityTranslation> {
  return api.post<LayoutEntityTranslation>(`${EDITOR_LAYOUTS_PATH}entity-translations/`, data, {
    errorMessage: "Could not add floor plan translation.",
  })
}

export function updateEntityTranslation(
  entityId: string,
  lang: string,
  data: { current: Record<string, string>; updated: Record<string, string> },
): Promise<LayoutEntityTranslation> {
  return api.put<LayoutEntityTranslation>(
    `${EDITOR_LAYOUTS_PATH}entity-translations/${entityId}/${lang}/`,
    data,
    { errorMessage: "Could not update floor plan translation." },
  )
}

export function deleteEntityTranslation(entityId: string, lang: string): Promise<void> {
  return api.del(`${EDITOR_LAYOUTS_PATH}entity-translations/${entityId}/${lang}/`, {
    errorMessage: "Could not delete floor plan translation.",
  })
}

// Table labels are DB-backed TableTranslation rows (FR-031) — the Layout tab
// drives the same records the removed "table" tab used.

export function createTableTranslation(
  publicId: string,
  data: { language_code: string; public_number: string },
): Promise<TableTranslation> {
  return api.post<TableTranslation>(`${TABLES_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add table translation.",
  })
}

export function updateTableTranslation(
  publicId: string,
  lang: string,
  data: { current: Record<string, string>; updated: Record<string, string> },
): Promise<TableTranslation> {
  return api.put<TableTranslation>(`${TABLES_PATH}${publicId}/translations/${lang}/`, data, {
    errorMessage: "Could not update table translation.",
  })
}

export function deleteTableTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${TABLES_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete table translation.",
  })
}

export function fetchZones(signal?: AbortSignal): Promise<AdminFloorZone[]> {
  return api.getList<AdminFloorZone>(ZONES_PATH, {
    signal,
    errorMessage: "Could not load zones.",
  })
}
