import type { WeekDay, WorkingHours, WorkingHoursDay } from "@/types/workingHours"
import type {
  AdminMenu,
  AdminMenuCategory,
  AdminMenuItem,
  Employee,
  Restaurant,
} from "@/types/api/types.gen"

export type { WeekDay, WorkingHours, WorkingHoursDay }

// The generated AdminMenu/Category/Item types embed `translations` as a lossy
// array of dicts (drf-spectacular can't name the nested schema), so we keep the
// precise per-entity translation shapes here and replace the inline field.
export type MenuTranslation = {
  language_code: string
  name: string
}

export type MenuCategoryTranslation = {
  language_code: string
  name: string
}

export type MenuItemTranslation = {
  language_code: string
  name: string
  description?: string | null
}

// Re-exported from the generated OpenAPI types so they can't drift from the API.
export type { AdminMenu, AdminMenuItem }
export type AdminCategory = AdminMenuCategory
export type AdminEmployee = Employee

export type AdminMenuWithTranslations = Omit<AdminMenu, "translations"> & {
  translations: MenuTranslation[]
}
export type AdminCategoryWithTranslations = Omit<AdminMenuCategory, "translations"> & {
  translations: MenuCategoryTranslation[]
}
export type AdminMenuItemWithTranslations = Omit<AdminMenuItem, "translations"> & {
  translations: MenuItemTranslation[]
}

export type AdminAllergen = {
  public_id: string
  name: string
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
  name: string
  sort_order: number
  translations: IngredientTranslation[]
  created_at: string
  updated_at: string
}

export type IngredientTranslation = {
  language_code: string
  name: string
}

export type RestaurantTranslation = {
  language_code: string
  address: string
}

export type ZoneTranslation = {
  language_code: string
  name: string
}

export type TableTranslation = {
  language_code: string
  public_number: string
}

export type AdminZone = {
  public_id: string
  name: string
  translations: ZoneTranslation[]
}

export type AdminTable = {
  public_id: string
  public_number: string
  translations: TableTranslation[]
}

export type AdminRestaurantWithTranslations = AdminRestaurant & {
  translations: RestaurantTranslation[]
}

export type AdminZoneWithTranslations = AdminZone & {
  translations: ZoneTranslation[]
}

export type AdminTableWithTranslations = AdminTable & {
  translations: TableTranslation[]
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
  supported_languages?: string[]
  default_tax_rate?: string
  default_service_charge?: string
}
