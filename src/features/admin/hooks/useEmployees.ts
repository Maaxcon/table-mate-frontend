import { useCallback } from "react"
import { apiFetch, type Paginated } from "@/api/client"
import type { AdminEmployee } from "../types"
import { useResource } from "./useResource"

const BASE_PATH = "/api/restaurants/employees/"

type UseEmployeesResult = {
  employees: AdminEmployee[]
  loading: boolean
  error: string | null
  reload: () => void
  applyUpdate: (updated: AdminEmployee) => void
}

/** Loads the staff of the admin's restaurant (scoped by the auth context). */
export function useEmployees(): UseEmployeesResult {
  const fetcher = useCallback(async (signal: AbortSignal) => {
    const res = await apiFetch(BASE_PATH, { signal })
    if (!res.ok) throw new Error("load failed")
    const data = (await res.json()) as Paginated<AdminEmployee>
    return data.results
  }, [])

  const { data, loading, error, reload, setData } = useResource<AdminEmployee[]>(fetcher, {
    errorMessage: "Could not load staff.",
  })

  const applyUpdate = useCallback(
    (updated: AdminEmployee) =>
      setData((prev) => (prev ?? []).map((e) => (e.public_id === updated.public_id ? updated : e))),
    [setData],
  )

  return { employees: data ?? [], loading, error, reload, applyUpdate }
}
