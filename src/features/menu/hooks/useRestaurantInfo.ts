import { useEffect, useReducer } from "react"
import { useTranslation } from "react-i18next"
import { fetchRestaurant } from "@/features/menu/api"
import type { PublicRestaurantSettings } from "@/features/menu/types"

export type RestaurantInfo = {
  name: string | null
  address: string | null
  phone: string | null
  coverImage: string | null
  telegramUrl: string
  facebookUrl: string
  settings: PublicRestaurantSettings | null
}

type State = RestaurantInfo & { notFound: boolean; fetchError: string | null }

type Action =
  | { type: "LOADING" }
  | {
      type: "SUCCESS"
      data: RestaurantInfo
    }
  | { type: "NOT_FOUND" }
  | { type: "ERROR"; message: string }

const initialState: State = {
  name: null,
  address: null,
  phone: null,
  coverImage: null,
  telegramUrl: "",
  facebookUrl: "",
  settings: null,
  notFound: false,
  fetchError: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADING":
      return { ...initialState, notFound: false, fetchError: null }
    case "SUCCESS":
      return { ...action.data, notFound: false, fetchError: null }
    case "NOT_FOUND":
      return { ...state, notFound: true, fetchError: null }
    case "ERROR":
      return { ...state, fetchError: action.message }
  }
}

function useRestaurantInfo(restaurantId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!restaurantId) return
    const controller = new AbortController()
    let mounted = true
    dispatch({ type: "LOADING" })
    fetchRestaurant(restaurantId, i18n.language)
      .then((data) => {
        if (!mounted) return
        dispatch({
          type: "SUCCESS",
          data: {
            name: data.name,
            address: data.address,
            phone: data.phone,
            coverImage: data.cover_image,
            telegramUrl: data.telegram_url,
            facebookUrl: data.facebook_url,
            settings: data.settings,
          },
        })
      })
      .catch((err: unknown) => {
        if (!mounted) return
        const is404 = err instanceof Error && err.message.startsWith("404")
        if (is404) {
          dispatch({ type: "NOT_FOUND" })
        } else {
          dispatch({ type: "ERROR", message: "Unable to load restaurant info. Please try again." })
        }
      })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [restaurantId, i18n.language])

  return state
}

export { useRestaurantInfo }
