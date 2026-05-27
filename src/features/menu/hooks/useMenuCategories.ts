import { useEffect, useReducer } from "react"
import { fetchCategories } from "../api"
import type { MenuCategory } from "@/types/menu"

type State = {
  categories: MenuCategory[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: "LOADING" }
  | { type: "SUCCESS"; categories: MenuCategory[] }
  | { type: "ERROR" }

const initialState: State = { categories: [], loading: true, error: null }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true }
    case "SUCCESS":
      return { categories: action.categories, loading: false, error: null }
    case "ERROR":
      return { ...state, loading: false, error: "Failed to load categories" }
  }
}

type UseMenuCategoriesResult = {
  categories: MenuCategory[]
  categoriesLoading: boolean
  categoriesError: string | null
}

function useMenuCategories(restaurantId: string): UseMenuCategoriesResult {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    dispatch({ type: "LOADING" })
    fetchCategories(restaurantId)
      .then((data) => {
        if (mounted) dispatch({ type: "SUCCESS", categories: data.results })
      })
      .catch(() => {
        if (mounted) dispatch({ type: "ERROR" })
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  return {
    categories: state.categories,
    categoriesLoading: state.loading,
    categoriesError: state.error,
  }
}

export { useMenuCategories }
