import { apiFetch } from "@/api/client"
import type { AdminCategory, AdminMenu } from "./types"

const MENUS_PATH = "/api/menu/admin/menus/"
const CATEGORIES_PATH = "/api/menu/admin/categories/"

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
