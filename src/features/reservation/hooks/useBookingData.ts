import { useCallback, useEffect, useRef, useState } from "react"
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

  // Guards every fetch callback so we never set state after the page unmounts
  // (the user may leave while a request is still in flight). Reset on (re)mount
  // so React StrictMode's mount/unmount/mount cycle keeps it accurate.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Loaders only fetch and store results — no synchronous setState — so the
  // mount effect below stays clean. The reload wrappers own the loading flag.
  const loadTables = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchTables(restaurantId)
      .then((data) => {
        if (!mountedRef.current) return
        setTables(data)
        setTablesError(false)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setTables([])
        setTablesError(true)
      })
      .finally(() => {
        if (mountedRef.current) setTablesLoading(false)
      })
  }, [restaurantId])

  const loadZones = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchZones(restaurantId)
      .then((data) => {
        if (!mountedRef.current) return
        setZones(data)
        if (data.length > 0) setSelectedZone(data[0].public_id)
      })
      .catch(() => {
        if (mountedRef.current) setZones([])
      })
  }, [restaurantId])

  const loadSettings = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchRestaurantSettings(restaurantId)
      .then((settings) => {
        if (!mountedRef.current) return
        setWorkingHours(settings.working_hours)
        setTimezone(settings.timezone)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setWorkingHours(null)
        setTimezone(null)
      })
  }, [restaurantId])

  const loadReservations = useCallback(() => {
    if (!restaurantId || !isAuthenticated) return Promise.resolve()
    return fetchMyReservations(restaurantId)
      .then((data) => {
        if (!mountedRef.current) return
        setReservations(data)
        setReservationsError(false)
      })
      .catch(() => {
        if (!mountedRef.current) return
        setReservations([])
        setReservationsError(true)
      })
      .finally(() => {
        if (mountedRef.current) setReservationsLoading(false)
      })
  }, [restaurantId, isAuthenticated])

  const loadUpcoming = useCallback(() => {
    if (!restaurantId) return Promise.resolve()
    return fetchUpcomingReservations(restaurantId)
      .then((data) => {
        if (mountedRef.current) setUpcomingReservations(data)
      })
      .catch(() => {
        if (mountedRef.current) setUpcomingReservations([])
      })
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
