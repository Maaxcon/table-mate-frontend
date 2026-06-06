import type { WeekDay, WorkingHours, WorkingHoursDay } from "@/types/workingHours"
import type { AdminMenu, AdminMenuCategory, AdminMenuItem, Employee } from "@/types/api/types.gen"

export type { WeekDay, WorkingHours, WorkingHoursDay }

// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { AdminMenu, AdminMenuItem }
export type AdminCategory = AdminMenuCategory
export type AdminEmployee = Employee

// The admin UI only assigns these three roles (the API's RoleEnum also has
// "customer", which staff management never sets).
export type EmployeeRole = "admin" | "waiter" | "cook"

// Kept hand-written: the generated Restaurant/RestaurantSettings components do
// not expose the admin edit fields cleanly (working_hours is an untyped
// `unknown`, and the Restaurant component omits the social/hours fields). These
// can move onto generated types once the backend schema types those fields.
export type AdminRestaurant = {
  public_id: string
  name: string
  address: string
  phone: string
  telegram_url: string
  facebook_url: string
  working_hours: WorkingHours
  // Read-only here; uploaded via the dedicated cover endpoint.
  cover_image: string | null
}

// DRF serializes DecimalField as a string (e.g. "0.2000").
export type AdminSettings = {
  public_id: string
  timezone: string
  currency: string
  locale: string
  default_tax_rate: string
  default_service_charge: string
}
