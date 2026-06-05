import { api } from "@/api/client"
import type { AdminEmployee, EmployeeRole } from "./types"

const EMPLOYEES_PATH = "/api/restaurants/employees/"

export type NewEmployee = {
  email: string
  first_name: string
  last_name: string
  phone: string
  role: EmployeeRole
}

export function createEmployee(payload: NewEmployee): Promise<AdminEmployee> {
  return api.post<AdminEmployee>(EMPLOYEES_PATH, payload, {
    errorMessage: "Could not add employee.",
  })
}

export type EmployeePatch = Partial<Pick<AdminEmployee, "role" | "is_active">>

export function updateEmployee(publicId: string, patch: EmployeePatch): Promise<AdminEmployee> {
  return api.patch<AdminEmployee>(`${EMPLOYEES_PATH}${publicId}/`, patch, {
    errorMessage: "Could not update employee.",
  })
}
