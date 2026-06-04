import { useCallback, useEffect, useState } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import {
  fetchCategories,
  fetchItems,
  fetchMenus,
  setCategorySortOrder,
  setItemSortOrder,
} from "../menuApi"
import { useToast } from "../components/toastContext"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "../types"

const UNCATEGORIZED = "__none__"

/** Moves `activeId` to `overId`'s slot within their shared category group, then
 * renumbers sort_order across the whole list (categories order first,
 * uncategorized last). Returns null for cross-group or invalid moves. */
function reorderItemsByIds(
  items: AdminMenuItem[],
  categories: AdminCategory[],
  activeId: string,
  overId: string,
): AdminMenuItem[] | null {
  const groups = new Map<string, AdminMenuItem[]>()
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const active = items.find((i) => i.public_id === activeId)
  const over = items.find((i) => i.public_id === overId)
  if (!active || !over) return null
  const groupKey = active.category ?? UNCATEGORIZED
  if ((over.category ?? UNCATEGORIZED) !== groupKey) return null // within-group only
  const group = groups.get(groupKey)!
  const oldIndex = group.findIndex((i) => i.public_id === activeId)
  const newIndex = group.findIndex((i) => i.public_id === overId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null
  groups.set(groupKey, arrayMove(group, oldIndex, newIndex))

  const orderedKeys = [
    ...categories.map((c) => c.public_id),
    ...[...groups.keys()].filter(
      (k) => k !== UNCATEGORIZED && !categories.some((c) => c.public_id === k),
    ),
    UNCATEGORIZED,
  ]
  const ordered: AdminMenuItem[] = []
  for (const key of orderedKeys) ordered.push(...(groups.get(key) ?? []))
  return ordered.map((item, i) => ({ ...item, sort_order: i }))
}

type UseMenuAdminResult = {
  menus: AdminMenu[]
  selectedMenuId: string | null
  selectMenu: (publicId: string) => void
  categories: AdminCategory[]
  items: AdminMenuItem[]
  loadingMenus: boolean
  loadingCategories: boolean
  loadingItems: boolean
  error: string | null
  reloadMenus: () => void
  reloadCategories: () => void
  reloadItems: () => void
  reorderCategory: (activeId: string, overId: string) => void
  reorderItem: (activeId: string, overId: string) => void
}

/** Loads the restaurant's menus, tracks the selected menu, and loads its categories. */
export function useMenuAdmin(): UseMenuAdminResult {
  const [menus, setMenus] = useState<AdminMenu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [items, setItems] = useState<AdminMenuItem[]>([])
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menusKey, setMenusKey] = useState(0)
  const [categoriesKey, setCategoriesKey] = useState(0)
  const [itemsKey, setItemsKey] = useState(0)

  const toast = useToast()

  const reloadMenus = useCallback(() => setMenusKey((k) => k + 1), [])
  const reloadCategories = useCallback(() => setCategoriesKey((k) => k + 1), [])
  const reloadItems = useCallback(() => setItemsKey((k) => k + 1), [])
  const selectMenu = useCallback((publicId: string) => setSelectedMenuId(publicId), [])

  const reorderCategory = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return
      const oldIndex = categories.findIndex((c) => c.public_id === activeId)
      const newIndex = categories.findIndex((c) => c.public_id === overId)
      if (oldIndex < 0 || newIndex < 0) return

      const renumbered = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({
        ...c,
        sort_order: i,
      }))
      const changed = renumbered.filter(
        (c) => categories.find((o) => o.public_id === c.public_id)?.sort_order !== c.sort_order,
      )

      setCategories(renumbered) // optimistic
      void Promise.all(changed.map((c) => setCategorySortOrder(c.public_id, c.sort_order))).catch(
        () => {
          toast.error("Could not reorder categories. Reverted.")
          reloadCategories() // revert to server truth on failure
        },
      )
    },
    [categories, reloadCategories, toast],
  )

  const reorderItem = useCallback(
    (activeId: string, overId: string) => {
      const reordered = reorderItemsByIds(items, categories, activeId, overId)
      if (!reordered) return

      const changed = reordered.filter(
        (it) => items.find((o) => o.public_id === it.public_id)?.sort_order !== it.sort_order,
      )

      setItems(reordered) // optimistic
      void Promise.all(changed.map((it) => setItemSortOrder(it.public_id, it.sort_order))).catch(
        () => {
          toast.error("Could not reorder dishes. Reverted.")
          reloadItems()
        },
      )
    },
    [items, categories, reloadItems, toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoadingMenus(true)
      try {
        const list = await fetchMenus(controller.signal)
        setMenus(list)
        setSelectedMenuId((cur) => {
          if (cur && list.some((m) => m.public_id === cur)) return cur
          return list[0]?.public_id ?? null
        })
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load menus.")
      } finally {
        if (!controller.signal.aborted) setLoadingMenus(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [menusKey])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!selectedMenuId) {
        setCategories([])
        return
      }
      setLoadingCategories(true)
      try {
        const list = await fetchCategories(selectedMenuId, controller.signal)
        setCategories(list)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load categories.")
      } finally {
        if (!controller.signal.aborted) setLoadingCategories(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedMenuId, categoriesKey])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!selectedMenuId) {
        setItems([])
        return
      }
      setLoadingItems(true)
      try {
        const list = await fetchItems(selectedMenuId, controller.signal)
        setItems(list)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load dishes.")
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedMenuId, itemsKey])

  return {
    menus,
    selectedMenuId,
    selectMenu,
    categories,
    items,
    loadingMenus,
    loadingCategories,
    loadingItems,
    error,
    reloadMenus,
    reloadCategories,
    reloadItems,
    reorderCategory,
    reorderItem,
  }
}
