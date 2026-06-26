import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Table } from "@/types/api/types.gen"
import type { UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import type { ReservationWithTable, WorkingHoursDay, Zone } from "../api"
import {
  fetchMyReservations,
  fetchRestaurantSettings,
  fetchTables,
  fetchUpcomingReservations,
  fetchZones,
} from "../api"

export interface BookingData {
  tables: Table[]
  setTables: Dispatch<SetStateAction<Table[]>>
  tablesLoading: boolean
  tablesError: boolean
  reloadTables: () => void

  zones: Zone[]
  selectedZone: string | null
  setSelectedZone: (id: string | null) => void

  workingHours: Record<string, WorkingHoursDay> | null
  timezone: string | null

  reservations: ReservationWithTable[]
  reservationsLoading: boolean
  reservationsError: boolean
  reloadReservations: () => void

  upcomingReservations: UpcomingReservation[]
  setUpcomingReservations: Dispatch<SetStateAction<UpcomingReservation[]>>
}

// Owns every data fetch the booking page needs: the floor (tables), zones,
// restaurant settings, the guest's reservations, and upcoming-reservation
// badges. Primary loads (tables, reservations) expose error + reload; the rest
// degrade quietly since they only enrich the view.
export function useBookingData(
  restaurantId: string | undefined,
  isAuthenticated: boolean,
): BookingData {
  const [tables, setTables] = useState<Table[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState(false)

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)

  const [reservations, setReservations] = useState<ReservationWithTable[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(isAuthenticated)
  const [reservationsError, setReservationsError] = useState(false)

  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([])

  // Loaders only fetch and store results — no synchronous setState — so the
  // mount effect below stays clean. The reload wrappers own the loading flag.
  const loadTables = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchTables(restaurantId)
      .then((data) => {
        setTables(data)
        setTablesError(false)
      })
      .catch(() => {
        setTables([])
        setTablesError(true)
      })
      .finally(() => setTablesLoading(false))
  }, [restaurantId])

  const loadZones = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchZones(restaurantId)
      .then((data) => {
        setZones(data)
        if (data.length > 0) setSelectedZone(data[0].public_id)
      })
      .catch(() => setZones([]))
  }, [restaurantId])

  const loadSettings = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchRestaurantSettings(restaurantId)
      .then((settings) => {
        setWorkingHours(settings.working_hours)
        setTimezone(settings.timezone)
      })
      .catch(() => {
        setWorkingHours(null)
        setTimezone(null)
      })
  }, [restaurantId])

  const loadReservations = useCallback(() => {
    if (!restaurantId || !isAuthenticated) return Promise.resolve()
    return fetchMyReservations(restaurantId)
      .then((data) => {
        setReservations(data)
        setReservationsError(false)
      })
      .catch(() => {
        setReservations([])
        setReservationsError(true)
      })
      .finally(() => setReservationsLoading(false))
  }, [restaurantId, isAuthenticated])

  const loadUpcoming = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchUpcomingReservations(restaurantId)
      .then(setUpcomingReservations)
      .catch(() => setUpcomingReservations([]))
  }, [restaurantId])

  useEffect(() => {
    loadTables()
    loadZones()
    loadSettings()
    loadReservations()
    loadUpcoming()
  }, [loadTables, loadZones, loadSettings, loadReservations, loadUpcoming])

  const reloadTables = useCallback(() => {
    setTablesLoading(true)
    loadTables()
  }, [loadTables])

  const reloadReservations = useCallback(() => {
    setReservationsLoading(true)
    loadReservations()
  }, [loadReservations])

  return {
    tables,
    setTables,
    tablesLoading,
    tablesError,
    reloadTables,
    zones,
    selectedZone,
    setSelectedZone,
    workingHours,
    timezone,
    reservations,
    reservationsLoading,
    reservationsError,
    reloadReservations,
    upcomingReservations,
    setUpcomingReservations,
  }
}
