import type { WeekDay, WorkingHours, WorkingHoursDay } from "@/types/workingHours"
import type {
  AdminMenu,
  AdminMenuCategory,
  AdminMenuItem,
  Employee,
  MenuCategoryTranslation,
  MenuItemTranslation,
  MenuTranslation,
  Restaurant,
} from "@/types/api/types.gen"

export type { WeekDay, WorkingHours, WorkingHoursDay }

// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { AdminMenu, AdminMenuItem }
export type { MenuCategoryTranslation, MenuItemTranslation, MenuTranslation }
export type AdminCategory = AdminMenuCategory
export type AdminEmployee = Employee

export type AdminMenuWithTranslations = AdminMenu & { translations: MenuTranslation[] }
export type AdminCategoryWithTranslations = AdminCategory & {
  translations: MenuCategoryTranslation[]
}
export type AdminMenuItemWithTranslations = AdminMenuItem & { translations: MenuItemTranslation[] }

export type AdminAllergen = {
  public_id: string
  key: string
  sort_order: number
  translations: AllergenTranslation[]
  created_at: string
  updated_at: string
}

export type AllergenTranslation = {
  language_code: string
  name: string
}

export type AdminIngredient = {
  public_id: string
  key: string
  sort_order: number
  translations: IngredientTranslation[]
  created_at: string
  updated_at: string
}

export type IngredientTranslation = {
  language_code: string
  name: string
}

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

// The generated schema only documents the trimmed booking-flow shape for
// this endpoint (GET /restaurant-settings/ is dynamic: admins get more
// fields than anonymous booking clients, which the OpenAPI schema can't
// express). Authenticated admins still receive these fields at runtime —
// hand-typed here instead of derived, since the generator no longer has them.
export type AdminSettings = {
  readonly public_id: string
  timezone?: string
  currency: string
  locale?: string
  default_tax_rate?: string
  default_service_charge?: string
}
