export type DishFeedbackEntry = {
  public_id?: string
  menu_item: string
  rating: number
  comment?: string
}

export type FeedbackCreateRequest = {
  order: string
  overall_rating: number
  service_rating: number
  comment?: string
  dish_feedback?: Omit<DishFeedbackEntry, "public_id">[]
}

export type FeedbackResponse = {
  public_id: string
  restaurant: string
  order: string
  overall_rating: number
  service_rating: number
  comment: string
  created_at: string
  updated_at: string
  dish_feedback: DishFeedbackEntry[]
}

export type AdminFeedbackResponse = FeedbackResponse & {
  guest: string | null
  review_status: "new" | "reviewed" | "resolved"
  prompt_shown_at: string | null
  dismissed: boolean
}

export type AdminFeedbackListResponse = Omit<AdminFeedbackResponse, "dish_feedback">

export type AdminFeedbackFilters = {
  restaurant_id?: number
  review_status?: "new" | "reviewed" | "resolved"
  overall_rating?: number
  service_rating?: number
  dish_id?: string
  date_from?: string
  date_to?: string
  ordering?: string
}

export type ReviewStatusUpdate = {
  review_status: "new" | "reviewed" | "resolved"
}
