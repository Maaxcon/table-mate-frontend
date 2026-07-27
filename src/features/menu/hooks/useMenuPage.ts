import { useCallback, useEffect, useState } from "react"
import { fetchAllergens } from "@/features/menu/api"
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
  ingredientSearch: string
  setIngredientSearch: (q: string) => void
  allergenOptions: string[]
  selectedAllergens: string[]
  toggleAllergen: (allergen: string) => void
  sortOrder: SortOrder
  setSortOrder: (s: SortOrder) => void
  setItemLikeState: (publicId: string, isLiked: boolean, likesCount: number) => void
  error: string | null
}

function useMenuPage(restaurantId: string, guestToken: string): UseMenuPageResult {
  const [activeCategory, setActiveCategoryState] = useState<string | null>(null)
  const [ingredientSearch, setIngredientSearchState] = useState("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("sort_order")
  const [allergenOptions, setAllergenOptions] = useState<string[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetchAllergens(controller.signal)
      .then(setAllergenOptions)
      .catch(() => {})
    return () => controller.abort()
  }, [])

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
    useMenuItems(
      restaurantId,
      activeCategory,
      ingredientSearch,
      guestToken,
      sortOrder,
      selectedAllergens,
    )

  const setActiveCategory = useCallback((id: string | null) => {
    setActiveCategoryState(id)
    setIngredientSearchState("")
  }, [])

  const setIngredientSearch = useCallback((q: string) => {
    setIngredientSearchState(q)
  }, [])

  const toggleAllergen = useCallback((allergen: string) => {
    setSelectedAllergens((current) =>
      current.includes(allergen)
        ? current.filter((value) => value !== allergen)
        : [...current, allergen],
    )
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
    ingredientSearch,
    setIngredientSearch,
    allergenOptions,
    selectedAllergens,
    toggleAllergen,
    sortOrder,
    setSortOrder,
    setItemLikeState,
    error: itemsError ?? categoriesError,
  }
}

export { useMenuPage }
