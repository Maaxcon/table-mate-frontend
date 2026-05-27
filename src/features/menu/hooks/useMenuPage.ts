import { useCallback, useEffect, useReducer } from "react"
import { fetchCategories, fetchItems, fetchRestaurant, searchItems } from "../api"
import type { PublicRestaurantSettings } from "../api"
import type { MenuCategory, MenuItem } from "@/types/menu"

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

type State = {
  restaurantName: string | null
  restaurantAddress: string | null
  restaurantPhone: string | null
  restaurantSettings: PublicRestaurantSettings | null
  categories: MenuCategory[]
  categoriesLoading: boolean
  activeCategory: string | null
  items: MenuItem[]
  itemsLoading: boolean
  loadingMore: boolean
  page: number
  hasMore: boolean
  searchQuery: string
  error: string | null
}

type Action =
  | {
      type: "RESTAURANT_SUCCESS"
      name: string
      address: string
      phone: string
      settings: PublicRestaurantSettings | null
    }
  | { type: "CATEGORIES_LOADING" }
  | { type: "CATEGORIES_SUCCESS"; categories: MenuCategory[] }
  | { type: "CATEGORIES_ERROR" }
  | { type: "ITEMS_LOADING" }
  | { type: "ITEMS_LOADING_MORE" }
  | { type: "ITEMS_SUCCESS"; results: MenuItem[]; next: string | null }
  | { type: "ITEMS_APPEND"; results: MenuItem[]; next: string | null }
  | { type: "ITEMS_ERROR"; message: string }
  | { type: "SET_CATEGORY"; id: string | null }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_ITEM_LIKE"; publicId: string; isLiked: boolean; likesCount: number }

const initialState: State = {
  restaurantName: null,
  restaurantAddress: null,
  restaurantPhone: null,
  restaurantSettings: null,
  categories: [],
  categoriesLoading: true,
  activeCategory: null,
  items: [],
  itemsLoading: true,
  loadingMore: false,
  page: 1,
  hasMore: false,
  searchQuery: "",
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESTAURANT_SUCCESS":
      return {
        ...state,
        restaurantName: action.name,
        restaurantAddress: action.address,
        restaurantPhone: action.phone,
        restaurantSettings: action.settings,
      }
    case "CATEGORIES_LOADING":
      return { ...state, categoriesLoading: true }
    case "CATEGORIES_SUCCESS":
      return { ...state, categoriesLoading: false, categories: action.categories }
    case "CATEGORIES_ERROR":
      return { ...state, categoriesLoading: false, error: "Failed to load categories" }
    case "ITEMS_LOADING":
      return { ...state, itemsLoading: true, loadingMore: false }
    case "ITEMS_LOADING_MORE":
      return { ...state, loadingMore: true }
    case "ITEMS_SUCCESS":
      return {
        ...state,
        itemsLoading: false,
        loadingMore: false,
        items: action.results,
        hasMore: action.next !== null,
        page: 1,
      }
    case "ITEMS_APPEND":
      return {
        ...state,
        itemsLoading: false,
        loadingMore: false,
        items: [...state.items, ...action.results],
        hasMore: action.next !== null,
        page: state.page + 1,
      }
    case "ITEMS_ERROR":
      return { ...state, itemsLoading: false, loadingMore: false, error: action.message }
    case "SET_CATEGORY":
      return { ...state, activeCategory: action.id, searchQuery: "" }
    case "SET_SEARCH":
      return {
        ...state,
        searchQuery: action.query,
        ...(action.query ? { activeCategory: null } : {}),
      }
    case "SET_ITEM_LIKE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.public_id === action.publicId
            ? {
                ...item,
                is_liked: action.isLiked,
                likes_count: action.likesCount,
              }
            : item,
        ),
      }
  }
}

function useMenuPage(restaurantId: string, guestToken: string): UseMenuPageResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { activeCategory, searchQuery, itemsLoading, loadingMore, hasMore, page } = state

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    fetchRestaurant(restaurantId)
      .then((data) => {
        if (mounted)
          dispatch({
            type: "RESTAURANT_SUCCESS",
            name: data.name,
            address: data.address,
            phone: data.phone,
            settings: data.settings,
          })
      })
      .catch(() => {
        /* non-critical, fail silently */
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    dispatch({ type: "CATEGORIES_LOADING" })
    fetchCategories(restaurantId)
      .then((data) => {
        if (mounted) dispatch({ type: "CATEGORIES_SUCCESS", categories: data.results })
      })
      .catch(() => {
        if (mounted) dispatch({ type: "CATEGORIES_ERROR" })
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    const isSearching = searchQuery.trim().length > 0

    const load = () => {
      dispatch({ type: "ITEMS_LOADING" })
      const promise = isSearching
        ? searchItems(restaurantId, searchQuery.trim(), guestToken)
        : fetchItems({
            restaurantId,
            categoryId: activeCategory ?? undefined,
            guestToken,
          })
      promise
        .then((data) => {
          if (!mounted) return
          dispatch({ type: "ITEMS_SUCCESS", results: data.results, next: data.next })
        })
        .catch(() => {
          if (mounted) dispatch({ type: "ITEMS_ERROR", message: "Failed to load items" })
        })
    }

    if (isSearching) {
      const timer = setTimeout(load, 400)
      return () => {
        mounted = false
        clearTimeout(timer)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [restaurantId, activeCategory, searchQuery, guestToken])

  const setActiveCategory = useCallback((id: string | null) => {
    dispatch({ type: "SET_CATEGORY", id })
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH", query })
  }, [])

  const loadMore = useCallback(() => {
    if (itemsLoading || loadingMore || !hasMore || searchQuery) return
    dispatch({ type: "ITEMS_LOADING_MORE" })
    fetchItems({
      restaurantId,
      categoryId: activeCategory ?? undefined,
      page: page + 1,
      guestToken,
    })
      .then((data) => dispatch({ type: "ITEMS_APPEND", results: data.results, next: data.next }))
      .catch(() => dispatch({ type: "ITEMS_ERROR", message: "Failed to load more" }))
  }, [
    itemsLoading,
    loadingMore,
    hasMore,
    searchQuery,
    page,
    restaurantId,
    activeCategory,
    guestToken,
  ])

  const setItemLikeState = useCallback((publicId: string, isLiked: boolean, likesCount: number) => {
    dispatch({ type: "SET_ITEM_LIKE", publicId, isLiked, likesCount })
  }, [])

  return {
    restaurantName: state.restaurantName,
    restaurantAddress: state.restaurantAddress,
    restaurantPhone: state.restaurantPhone,
    restaurantSettings: state.restaurantSettings,
    categories: state.categories,
    categoriesLoading: state.categoriesLoading,
    activeCategory,
    setActiveCategory,
    items: state.items,
    itemsLoading,
    loadingMore,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    setItemLikeState,
    error: state.error,
  }
}

export { useMenuPage }
