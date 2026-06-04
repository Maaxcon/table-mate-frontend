import { useEffect, useState } from "react"
import { fetchOverview, type AdminOverview } from "../overviewApi"

type UseAdminOverviewResult = {
  data: AdminOverview | null
  loading: boolean
  error: string | null
}

export function useAdminOverview(): UseAdminOverviewResult {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      try {
        setData(await fetchOverview(controller.signal))
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load the overview.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  return { data, loading, error }
}
