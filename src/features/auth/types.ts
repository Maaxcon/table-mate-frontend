export type GoogleFeedbackType = "success" | "error"

export type InitialGoogleFeedback = {
  code: string | null
  message: string
  type: GoogleFeedbackType
  cleanUrl: string | null
}

export type UserRole = "admin" | "waiter" | "cook" | "customer"

export type MeResponse = {
  public_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: UserRole
  restaurant_public_id: string | null
  created_at: string
}
