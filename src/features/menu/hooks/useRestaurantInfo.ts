import { useEffect, useState } from "react"
import { fetchRestaurant } from "../api"
import type { PublicRestaurantSettings } from "../api"

export type RestaurantInfo = {
  name: string | null
  address: string | null
  phone: string | null
  settings: PublicRestaurantSettings | null
}

type UseRestaurantInfoResult = RestaurantInfo & { notFound: boolean }

function useRestaurantInfo(restaurantId: string): UseRestaurantInfoResult {
  const [info, setInfo] = useState<RestaurantInfo>({
    name: null,
    address: null,
    phone: null,
    settings: null,
  })
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    let mounted = true
    fetchRestaurant(restaurantId)
      .then((data) => {
        if (mounted)
          setInfo({
            name: data.name,
            address: data.address,
            phone: data.phone,
            settings: data.settings,
          })
      })
      .catch(() => {
        if (mounted) setNotFound(true)
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  return { ...info, notFound }
}

export { useRestaurantInfo }
