import { useEffect, useState } from "react"
import { fetchRestaurant } from "../api"
import type { PublicRestaurantSettings } from "../api"

export type RestaurantInfo = {
  name: string | null
  address: string | null
  phone: string | null
  settings: PublicRestaurantSettings | null
}

function useRestaurantInfo(restaurantId: string): RestaurantInfo {
  const [info, setInfo] = useState<RestaurantInfo>({
    name: null,
    address: null,
    phone: null,
    settings: null,
  })

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
        /* non-critical */
      })
    return () => {
      mounted = false
    }
  }, [restaurantId])

  return info
}

export { useRestaurantInfo }
