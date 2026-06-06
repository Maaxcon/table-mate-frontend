import { api } from "@/api/client"
// The snake_case server shape comes from the generated types; this module maps
// it to a camelCase view model for the dashboard.
import type { AdminOverview as OverviewResponse } from "@/types/api/types.gen"

export type AdminOverview = {
  menusTotal: number
  menusActive: number
  dishesTotal: number
  dishesHidden: number
  categoriesTotal: number
  staffTotal: number
  staffActive: number
}

// One backend call returns exact counts (scoped to the admin's restaurant).
export async function fetchOverview(signal?: AbortSignal): Promise<AdminOverview> {
  const d = await api.get<Partial<OverviewResponse>>("/api/restaurants/admin/overview/", {
    signal,
    errorMessage: "Could not load overview.",
  })
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
