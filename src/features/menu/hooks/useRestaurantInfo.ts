import { useEffect, useState } from "react"
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

type UseRestaurantInfoResult = RestaurantInfo & { notFound: boolean; fetchError: string | null }

function useRestaurantInfo(restaurantId: string): UseRestaurantInfoResult {
  const [info, setInfo] = useState<RestaurantInfo>({
    name: null,
    address: null,
    phone: null,
    coverImage: null,
    telegramUrl: "",
    facebookUrl: "",
    settings: null,
  })
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    fetchRestaurant(restaurantId)
      .then((data) => {
        if (!mounted) return
        setInfo({
          name: data.name,
          address: data.address,
          phone: data.phone,
          coverImage: data.cover_image,
          telegramUrl: data.telegram_url,
          facebookUrl: data.facebook_url,
          settings: data.settings,
        })
      })
      .catch((err: unknown) => {
        if (!mounted) return
        const is404 = err instanceof Error && err.message.startsWith("404")
        if (is404) {
          setNotFound(true)
        } else {
          setFetchError("Unable to load restaurant info. Please try again.")
        }
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  return { ...info, notFound, fetchError }
}

export { useRestaurantInfo }
