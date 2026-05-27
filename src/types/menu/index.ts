export type MenuCategory = {
  public_id: string
  menu: string
  name: string
  sort_order: number
}

export type MenuItem = {
  public_id: string
  restaurant: string
  menu: string
  category: string
  name: string
  description: string | null
  ingredients: string[]
  weight_grams: number | null
  image: string | null
  likes_count: number
  is_liked: boolean
  price: string
  is_available: boolean
  sort_order: number
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
