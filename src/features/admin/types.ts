export type AdminRestaurant = {
  public_id: string
  name: string
  address: string
  phone: string
  telegram_url: string
  facebook_url: string
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

export type EmployeeRole = "admin" | "waiter" | "cook"

export type AdminEmployee = {
  public_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: EmployeeRole
  is_active: boolean
}

export type AdminMenu = {
  public_id: string
  name: string
  is_active: boolean
}

export type AdminCategory = {
  public_id: string
  menu: string
  name: string
  sort_order: number
}

export type AdminMenuItem = {
  public_id: string
  menu: string
  category: string | null
  name: string
  description: string | null
  price: string
  weight_grams: number | null
  is_available: boolean
  image: string | null
  sort_order: number
}
