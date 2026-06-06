import { useCallback } from "react"
import { api } from "@/api/client"
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
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.getAllList<AdminEmployee>(BASE_PATH, { signal, errorMessage: "Could not load staff." }),
    [],
  )

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
