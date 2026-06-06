import { useCallback, useMemo, useState } from "react"
import { arrayMove } from "@dnd-kit/sortable"
import {
  bulkItemAction,
  fetchCategories,
  fetchItems,
  fetchMenus,
  reorderCategories,
  reorderItems,
  updateItem,
} from "../api/menu"
import { useToast } from "./toastContext"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "../types"
import { useResource } from "./useResource"

const UNCATEGORIZED = "__none__"
// A drop on an empty category targets the group itself, not an item in it.
export const GROUP_DROP_PREFIX = "group:"

/** Moves `activeId` next to `overId` (an item) or into `overId`'s category
 * (a "group:<key>" drop target), possibly across categories, then renumbers
 * sort_order across the whole list (categories order first, uncategorized last).
 * The moved item's `category` is updated to its new group. Returns null for
 * invalid moves or no-ops. */
function moveItemsByIds(
  items: AdminMenuItem[],
  categories: AdminCategory[],
  activeId: string,
  overId: string,
): AdminMenuItem[] | null {
  const active = items.find((i) => i.public_id === activeId)
  if (!active) return null

  // Resolve the target category and, when dropping on a card, the card to land on.
  let targetKey: string
  let overItemId: string | null = null
  if (overId.startsWith(GROUP_DROP_PREFIX)) {
    targetKey = overId.slice(GROUP_DROP_PREFIX.length)
  } else {
    const over = items.find((i) => i.public_id === overId)
    if (!over) return null
    targetKey = over.category ?? UNCATEGORIZED
    overItemId = overId
  }
  if (overItemId === activeId) return null

  const groups = new Map<string, AdminMenuItem[]>()
  for (const c of categories) groups.set(c.public_id, [])
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  if (!groups.has(targetKey)) groups.set(targetKey, [])

  const sourceKey = active.category ?? UNCATEGORIZED
  const source = groups.get(sourceKey)!
  const fromIndex = source.findIndex((i) => i.public_id === activeId)
  if (fromIndex < 0) return null

  // Same-group reorder: move in place; cross-group: pull out then insert.
  if (sourceKey === targetKey) {
    const toIndex = overItemId
      ? source.findIndex((i) => i.public_id === overItemId)
      : source.length - 1
    if (toIndex < 0 || toIndex === fromIndex) return null
    groups.set(targetKey, arrayMove(source, fromIndex, toIndex))
  } else {
    source.splice(fromIndex, 1)
    const target = groups.get(targetKey)!
    const insertAt = overItemId
      ? Math.max(
          0,
          target.findIndex((i) => i.public_id === overItemId),
        )
      : target.length
    const moved = { ...active, category: targetKey === UNCATEGORIZED ? null : targetKey }
    target.splice(insertAt, 0, moved)
  }

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
  bulkSetAvailable: (ids: string[], isAvailable: boolean) => void
  bulkSetCategory: (ids: string[], category: string | null) => void
  bulkDelete: (ids: string[]) => void
}

/** Loads the restaurant's menus, tracks the selected menu, and loads its categories. */
export function useMenuAdmin(): UseMenuAdminResult {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const toast = useToast()

  const menusRes = useResource<AdminMenu[]>(fetchMenus, {
    errorMessage: "Could not load menus.",
    // Keep the current selection if it still exists, else pick the first menu.
    onSuccess: (list) =>
      setSelectedMenuId((cur) =>
        cur && list.some((m) => m.public_id === cur) ? cur : (list[0]?.public_id ?? null),
      ),
  })

  const loadCategories = useCallback(
    (signal: AbortSignal) => fetchCategories(selectedMenuId as string, signal),
    [selectedMenuId],
  )
  const categoriesRes = useResource<AdminCategory[]>(loadCategories, {
    enabled: selectedMenuId !== null,
    errorMessage: "Could not load categories.",
  })

  const loadItems = useCallback(
    (signal: AbortSignal) => fetchItems(selectedMenuId as string, signal),
    [selectedMenuId],
  )
  const itemsRes = useResource<AdminMenuItem[]>(loadItems, {
    enabled: selectedMenuId !== null,
    errorMessage: "Could not load dishes.",
  })

  const { data: categoriesData, setData: setCategoriesData } = categoriesRes
  const { data: itemsData, setData: setItemsData } = itemsRes

  const menus = menusRes.data ?? []
  // Memoized so they keep a stable identity for the callbacks' dependency arrays.
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])
  const items = useMemo(() => itemsData ?? [], [itemsData])
  const loadingMenus = menusRes.loading
  const loadingCategories = categoriesRes.loading
  const loadingItems = itemsRes.loading
  const error = menusRes.error ?? categoriesRes.error ?? itemsRes.error
  const reloadMenus = menusRes.reload
  const reloadCategories = categoriesRes.reload
  const reloadItems = itemsRes.reload

  // Adapters so the optimistic updates below keep their non-null array signature.
  // (setData from useState is stable, so these stay memoized.)
  const setCategories = useCallback(
    (update: AdminCategory[] | ((prev: AdminCategory[]) => AdminCategory[])) =>
      setCategoriesData((prev) => (typeof update === "function" ? update(prev ?? []) : update)),
    [setCategoriesData],
  )
  const setItems = useCallback(
    (update: AdminMenuItem[] | ((prev: AdminMenuItem[]) => AdminMenuItem[])) =>
      setItemsData((prev) => (typeof update === "function" ? update(prev ?? []) : update)),
    [setItemsData],
  )

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
      if (changed.length > 0) {
        void reorderCategories(
          changed.map((c) => ({ public_id: c.public_id, sort_order: c.sort_order ?? 0 })),
        ).catch(() => {
          toast.error("Could not reorder categories. Reverted.")
          reloadCategories() // revert to server truth on failure
        })
      }
    },
    [categories, reloadCategories, setCategories, toast],
  )

  const reorderItem = useCallback(
    (activeId: string, overId: string) => {
      const reordered = moveItemsByIds(items, categories, activeId, overId)
      if (!reordered) return

      const movedOld = items.find((i) => i.public_id === activeId)
      const movedNew = reordered.find((i) => i.public_id === activeId)
      const categoryChanged = (movedOld?.category ?? null) !== (movedNew?.category ?? null)
      const changed = reordered.filter(
        (it) => items.find((o) => o.public_id === it.public_id)?.sort_order !== it.sort_order,
      )
      if (changed.length === 0 && !categoryChanged) return

      setItems(reordered) // optimistic

      // The reorder endpoint only sets sort_order, so a category move is a
      // separate PATCH first, then the order is renumbered for the whole list.
      const persist = async () => {
        if (categoryChanged && movedNew) {
          await updateItem(activeId, { category: movedNew.category })
        }
        if (changed.length > 0) {
          await reorderItems(
            changed.map((it) => ({ public_id: it.public_id, sort_order: it.sort_order ?? 0 })),
          )
        }
      }
      void persist().catch(() => {
        toast.error("Could not move dish. Reverted.")
        reloadItems()
      })
    },
    [items, categories, reloadItems, setItems, toast],
  )

  const bulkSetAvailable = useCallback(
    (ids: string[], isAvailable: boolean) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      setItems((prev) =>
        prev.map((it) => (idSet.has(it.public_id) ? { ...it, is_available: isAvailable } : it)),
      )
      const noun = ids.length === 1 ? "Dish" : "Dishes"
      void bulkItemAction({ action: "set_available", ids, is_available: isAvailable })
        .then(() => toast.success(isAvailable ? `${noun} shown` : `${noun} hidden`))
        .catch(() => {
          toast.error("Could not update dishes. Reverted.")
          reloadItems()
        })
    },
    [reloadItems, setItems, toast],
  )

  const bulkSetCategory = useCallback(
    (ids: string[], category: string | null) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      setItems((prev) => prev.map((it) => (idSet.has(it.public_id) ? { ...it, category } : it)))
      void bulkItemAction({ action: "set_category", ids, category })
        .then(() => toast.success("Dishes moved"))
        .catch(() => {
          toast.error("Could not move dishes. Reverted.")
          reloadItems()
        })
    },
    [reloadItems, setItems, toast],
  )

  const bulkDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      // Remove from the UI right away, but defer the real delete so it can be
      // undone. The API call only fires once the undo window has passed.
      const snapshot = items
      setItems(items.filter((it) => !idSet.has(it.public_id)))

      let undone = false
      const timer = setTimeout(() => {
        if (undone) return
        void bulkItemAction({ action: "delete", ids }).catch(() => {
          toast.error("Could not delete dishes. Reverted.")
          reloadItems()
        })
      }, 5000)

      toast.action(
        ids.length === 1 ? "Dish deleted" : `${ids.length} dishes deleted`,
        "Undo",
        () => {
          undone = true
          clearTimeout(timer)
          setItems(snapshot)
        },
      )
    },
    [items, reloadItems, setItems, toast],
  )

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
    bulkSetAvailable,
    bulkSetCategory,
    bulkDelete,
  }
}
