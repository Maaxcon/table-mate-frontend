import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/api/client"
import type { AdminEmployee } from "../types"

const BASE_PATH = "/api/restaurants/employees/"

type Paginated<T> = { results: T[] }

type UseEmployeesResult = {
  employees: AdminEmployee[]
  loading: boolean
  error: string | null
  reload: () => void
}

/** Loads the staff of the admin's restaurant (scoped by the auth context). */
export function useEmployees(): UseEmployeesResult {
  const [employees, setEmployees] = useState<AdminEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      setLoading(true)
      try {
        const res = await apiFetch(BASE_PATH, { signal })
        if (!res.ok) throw new Error("load failed")
        const data = (await res.json()) as Paginated<AdminEmployee>
        setEmployees(data.results)
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load staff.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [reloadKey])

  return { employees, loading, error, reload }
}
