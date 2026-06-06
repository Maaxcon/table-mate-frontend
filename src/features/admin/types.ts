import type { WeekDay, WorkingHours, WorkingHoursDay } from "@/types/workingHours"
import type {
  AdminMenu,
  AdminMenuCategory,
  AdminMenuItem,
  Employee,
  Restaurant,
  RestaurantSettings,
} from "@/types/api/types.gen"

export type { WeekDay, WorkingHours, WorkingHoursDay }

// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { AdminMenu, AdminMenuItem }
export type AdminCategory = AdminMenuCategory
export type AdminEmployee = Employee

// The admin UI only assigns these three roles (the API's RoleEnum also has
// "customer", which staff management never sets).
export type EmployeeRole = "admin" | "waiter" | "cook"

// Derived from generated types. working_hours is added on top because it is
// write-only on the Restaurant serializer (read via to_representation), so the
// generated read schema omits it; we keep it on the shared frontend type the
// hours editor uses.
export type AdminRestaurant = Pick<
  Restaurant,
  "public_id" | "name" | "address" | "phone" | "telegram_url" | "facebook_url" | "cover_image"
> & { working_hours: WorkingHours }

export type AdminSettings = Pick<
  RestaurantSettings,
  "public_id" | "timezone" | "currency" | "locale" | "default_tax_rate" | "default_service_charge"
>
