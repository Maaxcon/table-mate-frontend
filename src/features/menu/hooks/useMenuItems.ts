import { useCallback, useEffect, useReducer, useRef } from "react"
import { fetchItems, searchItems } from "../api"
import type { MenuItem } from "@/types/menu"

type State = {
  items: MenuItem[]
  loading: boolean
  loadingMore: boolean
  page: number
  hasMore: boolean
  error: string | null
}

type Action =
  | { type: "LOADING" }
  | { type: "LOADING_MORE" }
  | { type: "SUCCESS"; results: MenuItem[]; next: string | null }
  | { type: "APPEND"; results: MenuItem[]; next: string | null }
  | { type: "ERROR"; message: string }
  | { type: "SET_LIKE"; publicId: string; isLiked: boolean; likesCount: number }

const initialState: State = {
  items: [],
  loading: true,
  loadingMore: false,
  page: 1,
  hasMore: false,
  error: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true, loadingMore: false }
    case "LOADING_MORE":
      return { ...state, loadingMore: true }
    case "SUCCESS":
      return {
        ...state,
        loading: false,
        loadingMore: false,
        items: action.results,
        hasMore: action.next !== null,
        page: 1,
      }
    case "APPEND":
      return {
        ...state,
        loading: false,
        loadingMore: false,
        items: [...state.items, ...action.results],
        hasMore: action.next !== null,
        page: state.page + 1,
      }
    case "ERROR":
      return { ...state, loading: false, loadingMore: false, error: action.message }
    case "SET_LIKE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.public_id === action.publicId
            ? { ...item, is_liked: action.isLiked, likes_count: action.likesCount }
            : item,
        ),
      }
  }
}

type UseMenuItemsResult = {
  items: MenuItem[]
  itemsLoading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  itemsError: string | null
  setItemLikeState: (publicId: string, isLiked: boolean, likesCount: number) => void
}

function useMenuItems(
  restaurantId: string,
  activeCategory: string | null,
  searchQuery: string,
  guestToken: string,
): UseMenuItemsResult {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { loading, loadingMore, hasMore, page } = state
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    if (!restaurantId) return
    const controller = new AbortController()
    const { signal } = controller
    const isSearching = searchQuery.trim().length > 0

    const load = () => {
      dispatch({ type: "LOADING" })
      const promise = isSearching
        ? searchItems(restaurantId, searchQuery.trim(), guestToken, signal)
        : fetchItems({ restaurantId, categoryId: activeCategory ?? undefined, guestToken, signal })
      promise
        .then((data) => {
          dispatch({ type: "SUCCESS", results: data.results, next: data.next })
        })
        .catch(() => {
          if (signal.aborted) return
          dispatch({ type: "ERROR", message: "Failed to load items" })
        })
    }

    if (isSearching) {
      const timer = setTimeout(load, 400)
      return () => {
        clearTimeout(timer)
        controller.abort()
      }
    }

    load()
    return () => {
      controller.abort()
    }
  }, [restaurantId, activeCategory, searchQuery, guestToken])

  const loadMore = useCallback(() => {
    if (loading || loadingMoreRef.current || !hasMore || searchQuery) return
    loadingMoreRef.current = true
    dispatch({ type: "LOADING_MORE" })
    fetchItems({
      restaurantId,
      categoryId: activeCategory ?? undefined,
      page: page + 1,
      guestToken,
    })
      .then((data) => {
        loadingMoreRef.current = false
        dispatch({ type: "APPEND", results: data.results, next: data.next })
      })
      .catch(() => {
        loadingMoreRef.current = false
        dispatch({ type: "ERROR", message: "Failed to load more" })
      })
  }, [loading, hasMore, searchQuery, page, restaurantId, activeCategory, guestToken])

  const setItemLikeState = useCallback((publicId: string, isLiked: boolean, likesCount: number) => {
    dispatch({ type: "SET_LIKE", publicId, isLiked, likesCount })
  }, [])

  return {
    items: state.items,
    itemsLoading: loading,
    loadingMore,
    hasMore,
    loadMore,
    itemsError: state.error,
    setItemLikeState,
  }
}

export { useMenuItems }
