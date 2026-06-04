import { apiFetch } from "@/api/client"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "./types"

const MENUS_PATH = "/api/menu/admin/menus/"
const CATEGORIES_PATH = "/api/menu/admin/categories/"
const ITEMS_PATH = "/api/menu/admin/items/"

type Paginated<T> = { results: T[] }

export async function fetchMenus(signal?: AbortSignal): Promise<AdminMenu[]> {
  const res = await apiFetch(MENUS_PATH, { signal })
  if (!res.ok) throw new Error("Could not load menus.")
  const data = (await res.json()) as Paginated<AdminMenu>
  return data.results
}

export async function fetchCategories(
  menuPublicId: string,
  signal?: AbortSignal,
): Promise<AdminCategory[]> {
  const res = await apiFetch(`${CATEGORIES_PATH}?menu=${menuPublicId}&ordering=sort_order`, {
    signal,
  })
  if (!res.ok) throw new Error("Could not load categories.")
  const data = (await res.json()) as Paginated<AdminCategory>
  return data.results
}

export async function fetchItems(
  menuPublicId: string,
  signal?: AbortSignal,
): Promise<AdminMenuItem[]> {
  const res = await apiFetch(`${ITEMS_PATH}?menu=${menuPublicId}&ordering=sort_order`, { signal })
  if (!res.ok) throw new Error("Could not load dishes.")
  const data = (await res.json()) as Paginated<AdminMenuItem>
  return data.results
}

async function firstError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const first = Object.values(data)[0]
    if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    if (typeof first === "string") return first
  } catch {
    // ignore parse errors
  }
  return fallback
}

export async function createMenu(name: string): Promise<AdminMenu> {
  const res = await apiFetch(MENUS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not create menu."))
  return (await res.json()) as AdminMenu
}

export async function updateMenu(
  publicId: string,
  patch: Partial<Pick<AdminMenu, "name" | "is_active">>,
): Promise<AdminMenu> {
  const res = await apiFetch(`${MENUS_PATH}${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not update menu."))
  return (await res.json()) as AdminMenu
}

export async function deleteMenu(publicId: string): Promise<void> {
  const res = await apiFetch(`${MENUS_PATH}${publicId}/`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) throw new Error("Could not delete menu.")
}

export async function createCategory(menuPublicId: string, name: string): Promise<AdminCategory> {
  const res = await apiFetch(CATEGORIES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ menu: menuPublicId, name }),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not create category."))
  return (await res.json()) as AdminCategory
}

export async function updateCategory(
  publicId: string,
  patch: Partial<Pick<AdminCategory, "name" | "sort_order">>,
): Promise<AdminCategory> {
  const res = await apiFetch(`${CATEGORIES_PATH}${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not update category."))
  return (await res.json()) as AdminCategory
}

export async function deleteCategory(publicId: string): Promise<void> {
  const res = await apiFetch(`${CATEGORIES_PATH}${publicId}/`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) throw new Error("Could not delete category.")
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

export async function createItem(payload: ItemInput): Promise<AdminMenuItem> {
  const res = await apiFetch(ITEMS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not save dish."))
  return (await res.json()) as AdminMenuItem
}

export async function updateItem(
  publicId: string,
  patch: Partial<Omit<ItemInput, "menu">>,
): Promise<AdminMenuItem> {
  const res = await apiFetch(`${ITEMS_PATH}${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not save dish."))
  return (await res.json()) as AdminMenuItem
}

export type ReorderEntry = { public_id: string; sort_order: number }

// One atomic request reorders many items at once (PATCH-per-item is gone).
export async function reorderItems(order: ReorderEntry[]): Promise<void> {
  const res = await apiFetch(`${ITEMS_PATH}reorder/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  })
  if (!res.ok && res.status !== 204) throw new Error("Could not reorder dishes.")
}

export async function reorderCategories(order: ReorderEntry[]): Promise<void> {
  const res = await apiFetch(`${CATEGORIES_PATH}reorder/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  })
  if (!res.ok && res.status !== 204) throw new Error("Could not reorder categories.")
}

export async function uploadItemImage(publicId: string, file: File): Promise<AdminMenuItem> {
  const form = new FormData()
  form.append("image", file)
  // No Content-Type header — the browser sets the multipart boundary.
  const res = await apiFetch(`${ITEMS_PATH}${publicId}/`, { method: "PATCH", body: form })
  if (!res.ok) throw new Error(await firstError(res, "Could not upload image."))
  return (await res.json()) as AdminMenuItem
}

export async function clearItemImage(publicId: string): Promise<AdminMenuItem> {
  const res = await apiFetch(`${ITEMS_PATH}${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: null }),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not remove image."))
  return (await res.json()) as AdminMenuItem
}

export async function fetchAllergens(signal?: AbortSignal): Promise<string[]> {
  const res = await apiFetch("/api/menu/allergens/", { signal })
  if (!res.ok) throw new Error("Could not load allergens.")
  return (await res.json()) as string[]
}

export async function duplicateItem(publicId: string): Promise<AdminMenuItem> {
  const res = await apiFetch(`${ITEMS_PATH}${publicId}/duplicate/`, { method: "POST" })
  if (!res.ok) throw new Error(await firstError(res, "Could not duplicate dish."))
  return (await res.json()) as AdminMenuItem
}

export async function deleteItem(publicId: string): Promise<void> {
  const res = await apiFetch(`${ITEMS_PATH}${publicId}/`, { method: "DELETE" })
  if (!res.ok && res.status !== 204) throw new Error("Could not delete dish.")
}
