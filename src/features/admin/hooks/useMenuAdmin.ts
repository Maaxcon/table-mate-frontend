import { useCallback, useMemo, useState } from "react"
import { fetchCategories, fetchItems, fetchMenus } from "@/features/admin/api/menu"
import type { AdminCategory, AdminMenu, AdminMenuItem } from "@/features/admin/types"
import { useResource } from "./useResource"
import { useMenuMutations, type MenuMutations } from "./useMenuMutations"

type UseMenuAdminResult = MenuMutations & {
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
}

/** Loads the restaurant's menus + the selected menu's categories and dishes,
 * and exposes the write operations (via useMenuMutations). */
export function useMenuAdmin(): UseMenuAdminResult {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)

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
  // Memoized so they keep a stable identity for the mutations' dependency arrays.
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])
  const items = useMemo(() => itemsData ?? [], [itemsData])
  const error = menusRes.error ?? categoriesRes.error ?? itemsRes.error
  const reloadCategories = categoriesRes.reload
  const reloadItems = itemsRes.reload

  // Adapters so the optimistic updates keep their non-null array signature.
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

  const mutations = useMenuMutations({
    categories,
    items,
    setCategories,
    setItems,
    reloadCategories,
    reloadItems,
  })

  return {
    menus,
    selectedMenuId,
    selectMenu,
    categories,
    items,
    loadingMenus: menusRes.loading,
    loadingCategories: categoriesRes.loading,
    loadingItems: itemsRes.loading,
    error,
    reloadMenus: menusRes.reload,
    reloadCategories,
    reloadItems,
    ...mutations,
  }
}
