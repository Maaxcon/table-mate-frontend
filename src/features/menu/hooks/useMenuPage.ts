import { useCallback, useEffect, useReducer } from "react"
import { fetchCategories, fetchItems, searchItems } from "../api"
import type { MenuCategory, MenuItem } from "@/types/menu"

export type UseMenuPageResult = {
  categories: MenuCategory[]
  categoriesLoading: boolean
  activeCategory: string | null
  setActiveCategory: (id: string | null) => void
  items: MenuItem[]
  itemsLoading: boolean
  hasMore: boolean
  loadMore: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  error: string | null
}

type State = {
  categories: MenuCategory[]
  categoriesLoading: boolean
  activeCategory: string | null
  items: MenuItem[]
  itemsLoading: boolean
  page: number
  hasMore: boolean
  searchQuery: string
  error: string | null
}

type Action =
  | { type: "CATEGORIES_LOADING" }
  | { type: "CATEGORIES_SUCCESS"; categories: MenuCategory[] }
  | { type: "CATEGORIES_ERROR" }
  | { type: "ITEMS_LOADING" }
  | { type: "ITEMS_SUCCESS"; results: MenuItem[]; next: string | null }
  | { type: "ITEMS_APPEND"; results: MenuItem[]; next: string | null }
  | { type: "ITEMS_ERROR"; message: string }
  | { type: "SET_CATEGORY"; id: string | null }
  | { type: "SET_SEARCH"; query: string }

const initialState: State = {
  categories: [],
  categoriesLoading: true,
  activeCategory: null,
  items: [],
  itemsLoading: true,
  page: 1,
  hasMore: false,
  searchQuery: "",
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "CATEGORIES_LOADING":
      return { ...state, categoriesLoading: true }
    case "CATEGORIES_SUCCESS":
      return { ...state, categoriesLoading: false, categories: action.categories }
    case "CATEGORIES_ERROR":
      return { ...state, categoriesLoading: false, error: "Failed to load categories" }
    case "ITEMS_LOADING":
      return { ...state, itemsLoading: true }
    case "ITEMS_SUCCESS":
      return {
        ...state,
        itemsLoading: false,
        items: action.results,
        hasMore: action.next !== null,
        page: 1,
      }
    case "ITEMS_APPEND":
      return {
        ...state,
        itemsLoading: false,
        items: [...state.items, ...action.results],
        hasMore: action.next !== null,
        page: state.page + 1,
      }
    case "ITEMS_ERROR":
      return { ...state, itemsLoading: false, error: action.message }
    case "SET_CATEGORY":
      return { ...state, activeCategory: action.id, searchQuery: "" }
    case "SET_SEARCH":
      return {
        ...state,
        searchQuery: action.query,
        ...(action.query ? { activeCategory: null } : {}),
      }
  }
}

function useMenuPage(restaurantId: string): UseMenuPageResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { activeCategory, searchQuery, itemsLoading, hasMore, page } = state

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
        ? searchItems(restaurantId, searchQuery.trim())
        : fetchItems({ restaurantId, categoryId: activeCategory ?? undefined })
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
  }, [restaurantId, activeCategory, searchQuery])

  const setActiveCategory = useCallback((id: string | null) => {
    dispatch({ type: "SET_CATEGORY", id })
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH", query })
  }, [])

  const loadMore = useCallback(() => {
    if (itemsLoading || !hasMore || searchQuery) return
    dispatch({ type: "ITEMS_LOADING" })
    fetchItems({ restaurantId, categoryId: activeCategory ?? undefined, page: page + 1 })
      .then((data) => dispatch({ type: "ITEMS_APPEND", results: data.results, next: data.next }))
      .catch(() => dispatch({ type: "ITEMS_ERROR", message: "Failed to load more" }))
  }, [itemsLoading, hasMore, searchQuery, page, restaurantId, activeCategory])

  return {
    categories: state.categories,
    categoriesLoading: state.categoriesLoading,
    activeCategory,
    setActiveCategory,
    items: state.items,
    itemsLoading,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    error: state.error,
  }
}

export { useMenuPage }
