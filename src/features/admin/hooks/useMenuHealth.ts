import { useEffect, useState } from "react"
import { fetchCategories, fetchItems, fetchMenus } from "../api/menu"

export type AttentionIssue = { id: string; label: string; to: string }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Loads the restaurant's menus/categories/dishes and derives a list of data
 * quality issues worth fixing (hidden menus, empty categories, dishes missing a
 * photo/description/price). Returns `issues: null` while loading or on failure.
 */
export function useMenuHealth(): { issues: AttentionIssue[] | null; loading: boolean } {
  const [issues, setIssues] = useState<AttentionIssue[] | null>(null)
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
        const items = groups.flatMap((g) => g.items)
        const categories = groups.flatMap((g) => g.categories)
        const categoriesWithItems = new Set(items.map((i) => i.category).filter(Boolean))

        const hiddenMenus = menus.filter((m) => !m.is_active).length
        const emptyCategories = categories.filter(
          (c) => !categoriesWithItems.has(c.public_id),
        ).length
        const noPhoto = items.filter((i) => !i.image).length
        const noDescription = items.filter((i) => !i.description?.trim()).length
        const noPrice = items.filter((i) => !(Number(i.price) > 0)).length

        const list: AttentionIssue[] = []
        if (hiddenMenus)
          list.push({
            id: "hidden-menus",
            label: `${plural(hiddenMenus, "menu is", "menus are")} hidden from customers`,
            to: "/admin/menu",
          })
        if (emptyCategories)
          list.push({
            id: "empty-categories",
            label: `${plural(emptyCategories, "category has", "categories have")} no dishes`,
            to: "/admin/menu",
          })
        if (noPhoto)
          list.push({
            id: "no-photo",
            label: `${plural(noPhoto, "dish has", "dishes have")} no photo`,
            to: "/admin/menu",
          })
        if (noDescription)
          list.push({
            id: "no-description",
            label: `${plural(noDescription, "dish has", "dishes have")} no description`,
            to: "/admin/menu",
          })
        if (noPrice)
          list.push({
            id: "no-price",
            label: `${plural(noPrice, "dish has", "dishes have")} no price set`,
            to: "/admin/menu",
          })

        setIssues(list)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setIssues(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return { issues, loading }
}
