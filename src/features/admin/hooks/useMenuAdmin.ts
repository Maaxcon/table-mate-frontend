import { useCallback, useEffect, useState } from "react"
import { fetchCategories, fetchMenus } from "../menuApi"
import type { AdminCategory, AdminMenu } from "../types"

type UseMenuAdminResult = {
  menus: AdminMenu[]
  selectedMenuId: string | null
  selectMenu: (publicId: string) => void
  categories: AdminCategory[]
  loadingMenus: boolean
  loadingCategories: boolean
  error: string | null
  reloadMenus: () => void
  reloadCategories: () => void
}

/** Loads the restaurant's menus, tracks the selected menu, and loads its categories. */
export function useMenuAdmin(): UseMenuAdminResult {
  const [menus, setMenus] = useState<AdminMenu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menusKey, setMenusKey] = useState(0)
  const [categoriesKey, setCategoriesKey] = useState(0)

  const reloadMenus = useCallback(() => setMenusKey((k) => k + 1), [])
  const reloadCategories = useCallback(() => setCategoriesKey((k) => k + 1), [])
  const selectMenu = useCallback((publicId: string) => setSelectedMenuId(publicId), [])

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

  return {
    menus,
    selectedMenuId,
    selectMenu,
    categories,
    loadingMenus,
    loadingCategories,
    error,
    reloadMenus,
    reloadCategories,
  }
}
