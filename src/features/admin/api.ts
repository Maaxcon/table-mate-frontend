import { apiFetch } from "@/api/client"
import type { AdminEmployee, EmployeeRole } from "./types"

const EMPLOYEES_PATH = "/api/restaurants/employees/"

export type NewEmployee = {
  email: string
  first_name: string
  last_name: string
  phone: string
  role: EmployeeRole
}

/** Reads the first field error DRF returns, e.g. {"email": ["already exists"]}. */
async function firstError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const first = Object.values(data)[0]
    if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    if (typeof first === "string") return first
  } catch {
    // ignore parse errors
  }
  return fallback
}

export async function createEmployee(payload: NewEmployee): Promise<AdminEmployee> {
  const res = await apiFetch(EMPLOYEES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not add employee."))
  return (await res.json()) as AdminEmployee
}

export type EmployeePatch = Partial<Pick<AdminEmployee, "role" | "is_active">>

export async function updateEmployee(
  publicId: string,
  patch: EmployeePatch,
): Promise<AdminEmployee> {
  const res = await apiFetch(`${EMPLOYEES_PATH}${publicId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await firstError(res, "Could not update employee."))
  return (await res.json()) as AdminEmployee
}
