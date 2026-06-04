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

type ListResponse = { count?: number; results?: { is_active?: boolean }[] }

// Admin lists use PageNumberPagination, so the `count` field gives exact totals.
async function getList(path: string, signal?: AbortSignal): Promise<Required<ListResponse>> {
  const res = await apiFetch(path, { signal })
  if (!res.ok) throw new Error("Could not load overview.")
  const data = (await res.json()) as ListResponse
  return { count: data.count ?? data.results?.length ?? 0, results: data.results ?? [] }
}

async function getCount(path: string, signal?: AbortSignal): Promise<number> {
  return (await getList(path, signal)).count
}

export async function fetchOverview(signal?: AbortSignal): Promise<AdminOverview> {
  const [menus, employees, dishesTotal, dishesHidden, categoriesTotal] = await Promise.all([
    getList("/api/menu/admin/menus/", signal),
    getList("/api/restaurants/employees/", signal),
    getCount("/api/menu/admin/items/", signal),
    getCount("/api/menu/admin/items/?is_available=false", signal),
    getCount("/api/menu/admin/categories/", signal),
  ])

  return {
    menusTotal: menus.count,
    // Menus and staff are few, so counting the first page of results is exact.
    menusActive: menus.results.filter((m) => m.is_active).length,
    dishesTotal,
    dishesHidden,
    categoriesTotal,
    staffTotal: employees.count,
    staffActive: employees.results.filter((e) => e.is_active).length,
  }
}
