import type { MenuData } from "../../hooks/useMenuData"

export type AttentionIssue = { id: string; label: string; to: string }
export type ChartDatum = { label: string; value: number }

const UNCATEGORIZED = "__none__"
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Data-quality issues worth fixing, derived from the loaded menu data. */
export function deriveIssues({ menus, categories, items }: MenuData): AttentionIssue[] {
  const categoriesWithItems = new Set(items.map((i) => i.category).filter(Boolean))
  const hiddenMenus = menus.filter((m) => !m.is_active).length
  const emptyCategories = categories.filter((c) => !categoriesWithItems.has(c.public_id)).length
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
  return list
}

/** Dish count per category (uncategorized last), highest first. */
export function deriveDishesByCategory({ categories, items }: MenuData): ChartDatum[] {
  const counts = new Map<string, number>()
  for (const it of items) {
    const key = it.category ?? UNCATEGORIZED
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const data = categories.map((c) => ({ label: c.name, value: counts.get(c.public_id) ?? 0 }))
  const uncategorized = counts.get(UNCATEGORIZED) ?? 0
  if (uncategorized) data.push({ label: "Uncategorized", value: uncategorized })
  return data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
}

/** Dishes grouped into five equal price ranges. */
export function derivePriceBuckets({ items }: MenuData): ChartDatum[] {
  const prices = items.map((i) => Number(i.price)).filter((n) => Number.isFinite(n) && n >= 0)
  if (prices.length === 0) return []
  const max = Math.max(...prices)
  if (max === 0) return [{ label: "0", value: prices.length }]
  const buckets = 5
  const step = Math.ceil(max / buckets) || 1
  const tally = Array.from({ length: buckets }, (_, i) => ({
    lo: i * step,
    hi: (i + 1) * step,
    value: 0,
  }))
  for (const p of prices) {
    const idx = Math.min(Math.floor(p / step), buckets - 1)
    tally[idx].value += 1
  }
  return tally.filter((b) => b.value > 0).map((b) => ({ label: `${b.lo}–${b.hi}`, value: b.value }))
}

/** Top five dishes by likes (only those with at least one like). */
export function deriveTopLiked({ items }: MenuData): ChartDatum[] {
  return items
    .map((i) => ({ label: i.name, value: i.likes_count ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}
