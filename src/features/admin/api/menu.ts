import { api } from "@/api/client"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "@/features/admin/types"

const MENUS_PATH = "/api/menu/admin/menus/"
const CATEGORIES_PATH = "/api/menu/admin/categories/"
const ITEMS_PATH = "/api/menu/admin/items/"
const ALLERGENS_PATH = "/api/menu/admin/allergens/"

export function fetchMenus(signal?: AbortSignal): Promise<AdminMenu[]> {
  return api.getAllList<AdminMenu>(MENUS_PATH, { signal, errorMessage: "Could not load menus." })
}

export function fetchCategories(
  menuPublicId: string,
  signal?: AbortSignal,
): Promise<AdminCategory[]> {
  return api.getAllList<AdminCategory>(CATEGORIES_PATH, {
    query: { menu: menuPublicId, ordering: "sort_order" },
    signal,
    errorMessage: "Could not load categories.",
  })
}

export function fetchItems(menuPublicId: string, signal?: AbortSignal): Promise<AdminMenuItem[]> {
  return api.getAllList<AdminMenuItem>(ITEMS_PATH, {
    query: { menu: menuPublicId, ordering: "sort_order" },
    signal,
    errorMessage: "Could not load dishes.",
  })
}

export function createMenu(name: string): Promise<AdminMenu> {
  return api.post<AdminMenu>(MENUS_PATH, { name }, { errorMessage: "Could not create menu." })
}

export function updateMenu(
  publicId: string,
  patch: Partial<Pick<AdminMenu, "name" | "is_active">>,
): Promise<AdminMenu> {
  return api.patch<AdminMenu>(`${MENUS_PATH}${publicId}/`, patch, {
    errorMessage: "Could not update menu.",
  })
}

export function deleteMenu(publicId: string): Promise<void> {
  return api.del(`${MENUS_PATH}${publicId}/`, { errorMessage: "Could not delete menu." })
}

export function createCategory(
  menuPublicId: string,
  name: string,
  color?: string,
): Promise<AdminCategory> {
  const payload: Record<string, string> = { menu: menuPublicId, name }
  if (color) {
    payload.color = color
  }
  return api.post<AdminCategory>(CATEGORIES_PATH, payload, {
    errorMessage: "Could not create category.",
  })
}

export function updateCategory(
  publicId: string,
  patch: Partial<Pick<AdminCategory, "name" | "sort_order" | "color">>,
): Promise<AdminCategory> {
  return api.patch<AdminCategory>(`${CATEGORIES_PATH}${publicId}/`, patch, {
    errorMessage: "Could not update category.",
  })
}

export function deleteCategory(publicId: string): Promise<void> {
  return api.del(`${CATEGORIES_PATH}${publicId}/`, { errorMessage: "Could not delete category." })
}

export type ItemInput = {
  menu: string
  category: string | null
  name: string
  description: string
  price: string
  weight_grams: number | null
  is_available: boolean
  ingredients: string[]
  allergens: string[]
}

export function createItem(payload: ItemInput): Promise<AdminMenuItem> {
  return api.post<AdminMenuItem>(ITEMS_PATH, payload, { errorMessage: "Could not save dish." })
}

export function updateItem(
  publicId: string,
  patch: Partial<Omit<ItemInput, "menu">>,
): Promise<AdminMenuItem> {
  return api.patch<AdminMenuItem>(`${ITEMS_PATH}${publicId}/`, patch, {
    errorMessage: "Could not save dish.",
  })
}

export type ReorderEntry = { public_id: string; sort_order: number }

// One atomic request reorders many items at once (PATCH-per-item is gone).
export function reorderItems(order: ReorderEntry[]): Promise<void> {
  return api.post<void>(`${ITEMS_PATH}reorder/`, order, {
    errorMessage: "Could not reorder dishes.",
  })
}

export type BulkItemAction =
  | { action: "set_available"; ids: string[]; is_available: boolean }
  | { action: "set_category"; ids: string[]; category: string | null }
  | { action: "delete"; ids: string[] }

// One request applies hide/show, category change, or delete to many dishes.
export function bulkItemAction(payload: BulkItemAction): Promise<void> {
  return api.post<void>(`${ITEMS_PATH}bulk/`, payload, {
    errorMessage: "Could not update dishes.",
  })
}

export function reorderCategories(order: ReorderEntry[]): Promise<void> {
  return api.post<void>(`${CATEGORIES_PATH}reorder/`, order, {
    errorMessage: "Could not reorder categories.",
  })
}

export function uploadItemImage(publicId: string, file: File): Promise<AdminMenuItem> {
  const form = new FormData()
  form.append("image", file)
  return api.patch<AdminMenuItem>(`${ITEMS_PATH}${publicId}/`, form, {
    errorMessage: "Could not upload image.",
  })
}

export function clearItemImage(publicId: string): Promise<AdminMenuItem> {
  return api.patch<AdminMenuItem>(
    `${ITEMS_PATH}${publicId}/`,
    { image: null },
    { errorMessage: "Could not remove image." },
  )
}

export function fetchAllergens(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/api/menu/allergens/", {
    signal,
    errorMessage: "Could not load allergens.",
  })
}

export type AdminAllergen = {
  public_id: string
  name: string
}

export function fetchAdminAllergens(signal?: AbortSignal): Promise<AdminAllergen[]> {
  return api.getAllList<AdminAllergen>(ALLERGENS_PATH, {
    signal,
    errorMessage: "Could not load allergens.",
  })
}

export function createAllergen(name: string): Promise<AdminAllergen> {
  return api.post<AdminAllergen>(
    ALLERGENS_PATH,
    { name },
    {
      errorMessage: "Could not add allergen.",
    },
  )
}

export function deleteAllergen(publicId: string): Promise<void> {
  return api.del(`${ALLERGENS_PATH}${publicId}/`, { errorMessage: "Could not delete allergen." })
}

export function duplicateItem(publicId: string): Promise<AdminMenuItem> {
  return api.post<AdminMenuItem>(`${ITEMS_PATH}${publicId}/duplicate/`, undefined, {
    errorMessage: "Could not duplicate dish.",
  })
}

export function deleteItem(publicId: string): Promise<void> {
  return api.del(`${ITEMS_PATH}${publicId}/`, { errorMessage: "Could not delete dish." })
}
