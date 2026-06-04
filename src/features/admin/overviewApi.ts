import { apiFetch } from "@/api/client"

export type AdminOverview = {
  menusTotal: number
  menusActive: number
  dishesTotal: number
  dishesHidden: number
  categoriesTotal: number
  staffTotal: number
  staffActive: number
}

type OverviewResponse = {
  menus_total: number
  menus_active: number
  dishes_total: number
  dishes_hidden: number
  categories_total: number
  staff_total: number
  staff_active: number
}

// One backend call returns exact counts (scoped to the admin's restaurant).
export async function fetchOverview(signal?: AbortSignal): Promise<AdminOverview> {
  const res = await apiFetch("/api/restaurants/admin/overview/", { signal })
  if (!res.ok) throw new Error("Could not load overview.")
  const d = (await res.json()) as Partial<OverviewResponse>
  return {
    menusTotal: d.menus_total ?? 0,
    menusActive: d.menus_active ?? 0,
    dishesTotal: d.dishes_total ?? 0,
    dishesHidden: d.dishes_hidden ?? 0,
    categoriesTotal: d.categories_total ?? 0,
    staffTotal: d.staff_total ?? 0,
    staffActive: d.staff_active ?? 0,
  }
}
