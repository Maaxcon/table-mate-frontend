import { api } from "@/api/client"
import type { AdminRestaurant } from "../types"

const coverPath = (publicId: string) => `/api/restaurants/restaurants/${publicId}/cover/`

// The browser sets the multipart boundary for FormData.
export function uploadRestaurantCover(publicId: string, file: File): Promise<AdminRestaurant> {
  const form = new FormData()
  form.append("cover_image", file)
  return api.patch<AdminRestaurant>(coverPath(publicId), form, {
    errorMessage: "Could not upload cover image.",
  })
}

// Sending no file clears the cover.
export function clearRestaurantCover(publicId: string): Promise<AdminRestaurant> {
  return api.patch<AdminRestaurant>(
    coverPath(publicId),
    {},
    { errorMessage: "Could not remove cover image." },
  )
}
