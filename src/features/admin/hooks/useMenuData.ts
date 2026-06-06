import { useEffect, useState } from "react"
import { fetchCategories, fetchItems, fetchMenus } from "../api/menu"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "../types"

export type MenuData = {
  menus: AdminMenu[]
  categories: AdminCategory[]
  items: AdminMenuItem[]
}

/**
 * Loads every menu of the restaurant plus all their categories and dishes, so
 * pages (e.g. the Overview dashboard) can derive cross-menu stats. Returns
 * `data: null` while loading or on failure.
 */
export function useMenuData(): { data: MenuData | null; loading: boolean } {
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      try {
        const menus = await fetchMenus(controller.signal)
        const groups = await Promise.all(
          menus.map(async (m) => ({
            categories: await fetchCategories(m.public_id, controller.signal),
            items: await fetchItems(m.public_id, controller.signal),
          })),
        )
        setData({
          menus,
          categories: groups.flatMap((g) => g.categories),
          items: groups.flatMap((g) => g.items),
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setData(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return { data, loading }
}
