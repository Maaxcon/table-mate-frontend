import { useCallback, useState } from "react"
import type { PublicRestaurantSettings } from "../api"
import type { MenuCategory, MenuItem } from "@/types/menu"
import { useRestaurantInfo } from "./useRestaurantInfo"
import { useMenuCategories } from "./useMenuCategories"
import { useMenuItems } from "./useMenuItems"

export type UseMenuPageResult = {
  restaurantName: string | null
  restaurantAddress: string | null
  restaurantPhone: string | null
  restaurantSettings: PublicRestaurantSettings | null
  categories: MenuCategory[]
  categoriesLoading: boolean
  activeCategory: string | null
  setActiveCategory: (id: string | null) => void
  items: MenuItem[]
  itemsLoading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  setItemLikeState: (publicId: string, isLiked: boolean, likesCount: number) => void
  error: string | null
}

function useMenuPage(restaurantId: string, guestToken: string): UseMenuPageResult {
  const [activeCategory, setActiveCategoryState] = useState<string | null>(null)
  const [searchQuery, setSearchQueryState] = useState("")

  const { name, address, phone, settings } = useRestaurantInfo(restaurantId)
  const { categories, categoriesLoading } = useMenuCategories(restaurantId)
  const { items, itemsLoading, loadingMore, hasMore, loadMore, itemsError, setItemLikeState } =
    useMenuItems(restaurantId, activeCategory, searchQuery, guestToken)

  const setActiveCategory = useCallback((id: string | null) => {
    setActiveCategoryState(id)
    setSearchQueryState("")
  }, [])

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q)
    if (q) setActiveCategoryState(null)
  }, [])

  return {
    restaurantName: name,
    restaurantAddress: address,
    restaurantPhone: phone,
    restaurantSettings: settings,
    categories,
    categoriesLoading,
    activeCategory,
    setActiveCategory,
    items,
    itemsLoading,
    loadingMore,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    setItemLikeState,
    error: itemsError,
  }
}

export { useMenuPage }
