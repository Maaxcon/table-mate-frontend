export type { GoogleFeedbackType, InitialGoogleFeedback } from "./googleAuth"

export type UserRole = "admin" | "waiter" | "cook" | "customer"

export type MeResponse = {
  public_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
}
