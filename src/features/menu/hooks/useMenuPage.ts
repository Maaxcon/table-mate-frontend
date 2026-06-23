import { useCallback, useState } from "react"
import type {
  MenuCategory,
  MenuItem,
  PublicRestaurantSettings,
  SortOrder,
} from "@/features/menu/types"
import { useRestaurantInfo } from "./useRestaurantInfo"
import { useMenuCategories } from "./useMenuCategories"
import { useMenuItems } from "./useMenuItems"

export type UseMenuPageResult = {
  restaurantName: string | null
  restaurantAddress: string | null
  restaurantPhone: string | null
  restaurantCoverImage: string | null
  restaurantTelegramUrl: string
  restaurantFacebookUrl: string
  restaurantSettings: PublicRestaurantSettings | null
  restaurantNotFound: boolean
  restaurantFetchError: string | null
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
  sortOrder: SortOrder
  setSortOrder: (s: SortOrder) => void
  setItemLikeState: (publicId: string, isLiked: boolean, likesCount: number) => void
  error: string | null
}

function useMenuPage(restaurantId: string, guestToken: string): UseMenuPageResult {
  const [activeCategory, setActiveCategoryState] = useState<string | null>(null)
  const [searchQuery, setSearchQueryState] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("sort_order")

  const {
    name,
    address,
    phone,
    coverImage,
    telegramUrl,
    facebookUrl,
    settings,
    notFound,
    fetchError,
  } = useRestaurantInfo(restaurantId)
  const { categories, categoriesLoading, categoriesError } = useMenuCategories(restaurantId)
  const { items, itemsLoading, loadingMore, hasMore, loadMore, itemsError, setItemLikeState } =
    useMenuItems(restaurantId, activeCategory, searchQuery, guestToken, sortOrder)

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
    restaurantCoverImage: coverImage,
    restaurantTelegramUrl: telegramUrl,
    restaurantFacebookUrl: facebookUrl,
    restaurantSettings: settings,
    restaurantNotFound: notFound,
    restaurantFetchError: fetchError,
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
    sortOrder,
    setSortOrder,
    setItemLikeState,
    error: itemsError ?? categoriesError,
  }
}

export { useMenuPage }
