import { api } from "@/api/client"
import type {
  AdminAllergen,
  AdminCategory,
  AdminIngredient,
  AdminMenu,
  AdminMenuItem,
  AdminMenuItemWithTranslations,
  AdminMenuWithTranslations,
  AdminCategoryWithTranslations,
  AllergenTranslation,
  IngredientTranslation,
  MenuCategoryTranslation,
  MenuItemTranslation,
  MenuTranslation,
} from "@/features/admin/types"

const MENUS_PATH = "/api/menu/admin/menus/"
const CATEGORIES_PATH = "/api/menu/admin/categories/"
const ITEMS_PATH = "/api/menu/admin/items/"
const ALLERGENS_PATH = "/api/menu/admin/allergens/"
const INGREDIENTS_PATH = "/api/menu/admin/ingredients/"

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

export function fetchMenusWithTranslations(
  signal?: AbortSignal,
): Promise<AdminMenuWithTranslations[]> {
  return api.getAllList<AdminMenuWithTranslations>(MENUS_PATH, {
    signal,
    errorMessage: "Could not load menus.",
  })
}

export function fetchCategoriesWithTranslations(
  signal?: AbortSignal,
): Promise<AdminCategoryWithTranslations[]> {
  return api.getAllList<AdminCategoryWithTranslations>(CATEGORIES_PATH, {
    signal,
    errorMessage: "Could not load categories.",
  })
}

export function fetchItemsWithTranslations(
  signal?: AbortSignal,
): Promise<AdminMenuItemWithTranslations[]> {
  return api.getAllList<AdminMenuItemWithTranslations>(ITEMS_PATH, {
    query: { ordering: "sort_order" },
    signal,
    errorMessage: "Could not load dishes.",
  })
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

export async function fetchAdminAllergens(signal?: AbortSignal): Promise<AdminAllergen[]> {
  const all = await api.getAllList<AdminAllergen>(ALLERGENS_PATH, {
    signal,
    errorMessage: "Could not load allergens.",
  })
  const seen = new Set<string>()
  return all.filter((item) => {
    if (seen.has(item.public_id)) return false
    seen.add(item.public_id)
    return true
  })
}

export async function fetchAdminIngredients(signal?: AbortSignal): Promise<AdminIngredient[]> {
  const all = await api.getAllList<AdminIngredient>(INGREDIENTS_PATH, {
    signal,
    errorMessage: "Could not load ingredients.",
  })
  const seen = new Set<string>()
  return all.filter((item) => {
    if (seen.has(item.public_id)) return false
    seen.add(item.public_id)
    return true
  })
}

export function duplicateItem(publicId: string): Promise<AdminMenuItem> {
  return api.post<AdminMenuItem>(`${ITEMS_PATH}${publicId}/duplicate/`, undefined, {
    errorMessage: "Could not duplicate dish.",
  })
}

export function deleteItem(publicId: string): Promise<void> {
  return api.del(`${ITEMS_PATH}${publicId}/`, { errorMessage: "Could not delete dish." })
}

// ── Menu Translations ──────────────────────────────────────────

export function createMenuTranslation(
  publicId: string,
  data: { language_code: string; name: string },
): Promise<MenuTranslation> {
  return api.post<MenuTranslation>(`${MENUS_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add translation.",
  })
}

export function updateMenuTranslation(
  publicId: string,
  lang: string,
  data: { name: string },
): Promise<MenuTranslation> {
  return api.put<MenuTranslation>(`${MENUS_PATH}${publicId}/translations/${lang}/`, data, {
    errorMessage: "Could not update translation.",
  })
}

export function deleteMenuTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${MENUS_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete translation.",
  })
}

// ── Category Translations ──────────────────────────────────────

export function createCategoryTranslation(
  publicId: string,
  data: { language_code: string; name: string },
): Promise<MenuCategoryTranslation> {
  return api.post<MenuCategoryTranslation>(`${CATEGORIES_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add translation.",
  })
}

export function updateCategoryTranslation(
  publicId: string,
  lang: string,
  data: { name: string },
): Promise<MenuCategoryTranslation> {
  return api.put<MenuCategoryTranslation>(
    `${CATEGORIES_PATH}${publicId}/translations/${lang}/`,
    data,
    {
      errorMessage: "Could not update translation.",
    },
  )
}

export function deleteCategoryTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${CATEGORIES_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete translation.",
  })
}

// ── Item Translations ──────────────────────────────────────────

export function createItemTranslation(
  publicId: string,
  data: { language_code: string; name: string; description?: string | null },
): Promise<MenuItemTranslation> {
  return api.post<MenuItemTranslation>(`${ITEMS_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add translation.",
  })
}

export function updateItemTranslation(
  publicId: string,
  lang: string,
  data: { name: string; description?: string | null },
): Promise<MenuItemTranslation> {
  return api.put<MenuItemTranslation>(`${ITEMS_PATH}${publicId}/translations/${lang}/`, data, {
    errorMessage: "Could not update translation.",
  })
}

export function deleteItemTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${ITEMS_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete translation.",
  })
}

// ── Allergen Translations ───────────────────────────────────────

export function createAllergenTranslation(
  publicId: string,
  data: { language_code: string; name: string },
): Promise<AllergenTranslation> {
  return api.post<AllergenTranslation>(`${ALLERGENS_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add translation.",
  })
}

export function updateAllergenTranslation(
  publicId: string,
  lang: string,
  data: { name: string },
): Promise<AllergenTranslation> {
  return api.put<AllergenTranslation>(`${ALLERGENS_PATH}${publicId}/translations/${lang}/`, data, {
    errorMessage: "Could not update translation.",
  })
}

export function deleteAllergenTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${ALLERGENS_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete translation.",
  })
}

// ── Ingredient Translations ─────────────────────────────────────

export function createIngredientTranslation(
  publicId: string,
  data: { language_code: string; name: string },
): Promise<IngredientTranslation> {
  return api.post<IngredientTranslation>(`${INGREDIENTS_PATH}${publicId}/translations/`, data, {
    errorMessage: "Could not add translation.",
  })
}

export function updateIngredientTranslation(
  publicId: string,
  lang: string,
  data: { name: string },
): Promise<IngredientTranslation> {
  return api.put<IngredientTranslation>(
    `${INGREDIENTS_PATH}${publicId}/translations/${lang}/`,
    data,
    {
      errorMessage: "Could not update translation.",
    },
  )
}

export function deleteIngredientTranslation(publicId: string, lang: string): Promise<void> {
  return api.del(`${INGREDIENTS_PATH}${publicId}/translations/${lang}/`, {
    errorMessage: "Could not delete translation.",
  })
}
