import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Table } from "@/types/api/types.gen"
import type { ReservationWithTable, WorkingHoursDay, Zone } from "@/features/reservation/api"
import {
  fetchMyReservations,
  fetchRestaurantSettings,
  fetchTables,
  fetchUpcomingReservations,
  fetchZones,
} from "@/features/reservation/api"
import type { UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { ActiveBookings } from "@/features/reservation/ActiveBookings"
import { BookModal } from "@/features/reservation/BookModal"
import { CustomerFloorPlan } from "@/features/reservation/CustomerFloorPlan"
import { LoginCtaModal } from "@/features/reservation/LoginCtaModal"
import { useFloorSubscription } from "@/features/reservation/hooks/useFloorSubscription"
import type {
  FloorTableStatusEvent,
  FloorNewReservationEvent,
  FloorReservationCancelledEvent,
} from "@/features/reservation/hooks/useFloorSubscription"
import { useAppSelector } from "@/store/hooks"
import "./BookingPage.css"

type Tab = "floor" | "bookings"

export function BookingPage() {
  const { public_restaurant_id } = useParams<{ public_restaurant_id: string }>()
  const user = useAppSelector((state) => state.auth.user)
  const isAuthenticated = !!user

  const [tab, setTab] = useState<Tab>("floor")

  const [tables, setTables] = useState<Table[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState(false)

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [loginCtaOpen, setLoginCtaOpen] = useState(false)

  const [reservations, setReservations] = useState<ReservationWithTable[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)
  const [reservationsError, setReservationsError] = useState(false)
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([])

  const loadTables = useCallback(async () => {
    if (!public_restaurant_id) return
    setTablesLoading(true)
    setTablesError(false)
    try {
      const data = await fetchTables(public_restaurant_id)
      setTables(data)
    } catch {
      setTables([])
      setTablesError(true)
    } finally {
      setTablesLoading(false)
    }
  }, [public_restaurant_id])

  const loadZones = useCallback(async () => {
    if (!public_restaurant_id) return
    try {
      const data = await fetchZones(public_restaurant_id)
      setZones(data)
      if (data.length > 0) setSelectedZone(data[0].public_id)
    } catch {
      // Zones only drive an optional filter; the floor plan still works without them.
      setZones([])
    }
  }, [public_restaurant_id])

  const filteredTables = selectedZone
    ? tables.filter((t) => t.zone?.public_id === selectedZone)
    : tables

  const loadSettings = useCallback(async () => {
    if (!public_restaurant_id) return
    try {
      const settings = await fetchRestaurantSettings(public_restaurant_id)
      setWorkingHours(settings.working_hours)
      setTimezone(settings.timezone)
    } catch {
      // Hours/timezone only refine the booking modal; slots come from the server either way.
      setWorkingHours(null)
      setTimezone(null)
    }
  }, [public_restaurant_id])

  const loadReservations = useCallback(async () => {
    if (!public_restaurant_id || !isAuthenticated) return
    setReservationsLoading(true)
    setReservationsError(false)
    try {
      const data = await fetchMyReservations(public_restaurant_id)
      setReservations(data)
    } catch {
      setReservations([])
      setReservationsError(true)
    } finally {
      setReservationsLoading(false)
    }
  }, [public_restaurant_id, isAuthenticated])

  const loadUpcoming = useCallback(async () => {
    if (!public_restaurant_id) return
    try {
      const data = await fetchUpcomingReservations(public_restaurant_id)
      setUpcomingReservations(data)
    } catch {
      // Upcoming-reservation badges are cosmetic; an empty list just hides them.
      setUpcomingReservations([])
    }
  }, [public_restaurant_id])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    loadTables()
    loadSettings()
    loadReservations()
    loadUpcoming()
    loadZones()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadTables, loadSettings, loadReservations, loadUpcoming, loadZones])

  const handleTableSelect = useCallback(
    (table: Table) => {
      if (!isAuthenticated) {
        setLoginCtaOpen(true)
        return
      }
      setSelectedTable(table)
      setBookModalOpen(true)
    },
    [isAuthenticated],
  )

  const handleBookingSuccess = useCallback(() => {
    setBookModalOpen(false)
    setSelectedTable(null)
    loadTables()
    loadReservations()
  }, [loadTables, loadReservations])

  const handleRefresh = useCallback(() => {
    loadReservations()
  }, [loadReservations])

  const handleTableStatusChanged = useCallback((event: FloorTableStatusEvent) => {
    const isOccupied = event.current_status === "occupied"
    setTables((prev) =>
      prev.map((t) => {
        if (t.public_id !== event.table_id) return t
        return { ...t, is_occupied: isOccupied }
      }),
    )
  }, [])

  const handleNewReservation = useCallback((event: FloorNewReservationEvent) => {
    setUpcomingReservations((prev) => [
      ...prev,
      {
        public_id: event.reservation_id,
        table_id: event.table_id,
        start_at: event.start_at,
      },
    ])
  }, [])

  const handleReservationCancelled = useCallback((event: FloorReservationCancelledEvent) => {
    setUpcomingReservations((prev) => prev.filter((r) => r.public_id !== event.reservation_id))
  }, [])

  useFloorSubscription({
    onTableStatusChanged: handleTableStatusChanged,
    onNewReservation: handleNewReservation,
    onReservationCancelled: handleReservationCancelled,
  })

  return (
    <div className="bp">
      <div className="bp__tabs">
        <button
          type="button"
          className={["bp__tab", tab === "floor" ? "bp__tab--active" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("floor")}
        >
          FLOOR PLAN
        </button>
        {isAuthenticated && (
          <button
            type="button"
            className={["bp__tab", tab === "bookings" ? "bp__tab--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab("bookings")}
          >
            MY BOOKINGS
          </button>
        )}
      </div>

      <div className="bp__content">
        {tab === "floor" &&
          (tablesLoading ? (
            <p className="bp__loading">Loading…</p>
          ) : tablesError ? (
            <div className="bp__error" role="alert">
              <p className="bp__error-text">Couldn't load the floor plan.</p>
              <button type="button" className="bp__retry" onClick={loadTables}>
                Try again
              </button>
            </div>
          ) : (
            <CustomerFloorPlan
              tables={filteredTables}
              zones={zones}
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              selectedId={selectedTable?.public_id ?? null}
              onSelect={handleTableSelect}
              upcomingReservations={upcomingReservations}
            />
          ))}

        {tab === "bookings" &&
          isAuthenticated &&
          (reservationsError ? (
            <div className="bp__error" role="alert">
              <p className="bp__error-text">Couldn't load your bookings.</p>
              <button type="button" className="bp__retry" onClick={handleRefresh}>
                Try again
              </button>
            </div>
          ) : (
            <ActiveBookings
              reservations={reservations}
              loading={reservationsLoading}
              workingHours={workingHours}
              onRefresh={handleRefresh}
            />
          ))}
      </div>

      {bookModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          timeZone={timezone}
          onClose={() => {
            setBookModalOpen(false)
            setSelectedTable(null)
          }}
          onSuccess={handleBookingSuccess}
        />
      )}

      {loginCtaOpen && <LoginCtaModal onClose={() => setLoginCtaOpen(false)} />}
    </div>
  )
}
