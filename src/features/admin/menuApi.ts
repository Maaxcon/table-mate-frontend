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
