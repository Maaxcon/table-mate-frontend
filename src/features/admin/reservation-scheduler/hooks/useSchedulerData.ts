import { useCallback, useEffect, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import { fetchTables } from "@/features/reservation/api"
import { fetchReservationsForRange } from "../api"
import type { SchedulerReservation, SchedulerTable } from "../types"

interface UseSchedulerDataReturn {
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  loading: boolean
  error: string | null
  refetch: () => void
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function useSchedulerData(dates: string[]): UseSchedulerDataReturn {
  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const [tables, setTables] = useState<SchedulerTable[]>([])
  const [reservations, setReservations] = useState<SchedulerReservation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!restaurantId || dates.length === 0) return

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      try {
        const dateFrom = addDays(dates[0], 0)
        const dateTo = addDays(dates[dates.length - 1], 0)
        const [tablesData, reservationsData] = await Promise.all([
          fetchTables(restaurantId!),
          fetchReservationsForRange(restaurantId!, dateFrom, dateTo),
        ])
        if (controller.signal.aborted) return
        setTables(
          tablesData
            .filter((t) => t.active !== false)
            .map((t) => ({
              public_id: t.public_id,
              public_number: t.public_number,
              capacity: t.capacity,
              zone: t.zone,
              active: t.active,
            })),
        )
        setReservations(reservationsData)
        setError(null)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()

    return () => controller.abort()
  }, [restaurantId, dates, refreshKey])

  return { tables, reservations, loading, error, refetch }
}
