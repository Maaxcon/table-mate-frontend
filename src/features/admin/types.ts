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
