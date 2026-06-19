import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Table } from "@/types/api/types.gen"
import type { ReservationWithTable, WorkingHoursDay, Zone } from "@/features/reservation/api"
import {
  fetchMyReservations,
  fetchRestaurantSettings,
  fetchLayoutData,
  fetchZones,
} from "@/features/reservation/api"
import type { LayoutPayload } from "@/features/editor/types"
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

  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [loginCtaOpen, setLoginCtaOpen] = useState(false)

  const [reservations, setReservations] = useState<ReservationWithTable[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([])
  const [layoutPayload, setLayoutPayload] = useState<LayoutPayload | null>(null)

  // Source the floor from the layout endpoint: it returns ALL active tables
  // (unpaginated) plus the layout payload and upcoming reservations together, so
  // every table the layout references is present to join against. /tables/ is
  // paginated (PAGE_SIZE 20) and would drop tables for larger restaurants.
  const loadTables = useCallback(async () => {
    if (!public_restaurant_id) return
    setTablesLoading(true)
    try {
      const data = await fetchLayoutData(public_restaurant_id)
      setTables(data.tables)
      setUpcomingReservations(data.upcoming_reservations)
      setLayoutPayload(
        data.layout && typeof data.layout === "object" ? (data.layout as LayoutPayload) : null,
      )
    } catch {
      setTables([])
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
      setZones([])
    }
  }, [public_restaurant_id])

  const loadSettings = useCallback(async () => {
    if (!public_restaurant_id) return
    try {
      const settings = await fetchRestaurantSettings(public_restaurant_id)
      setWorkingHours(settings.working_hours)
    } catch {
      setWorkingHours(null)
    }
  }, [public_restaurant_id])

  const loadReservations = useCallback(async () => {
    if (!public_restaurant_id || !isAuthenticated) return
    setReservationsLoading(true)
    try {
      const data = await fetchMyReservations(public_restaurant_id)
      setReservations(data)
    } catch {
      setReservations([])
    } finally {
      setReservationsLoading(false)
    }
  }, [public_restaurant_id, isAuthenticated])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    loadTables()
    loadSettings()
    loadReservations()
    loadZones()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadTables, loadSettings, loadReservations, loadZones])

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
    setUpcomingReservations((prev) => prev.filter((r) => r.table_id !== event.table_id))
  }, [])

  const handleLayoutPublished = useCallback(() => {
    loadTables()
  }, [loadTables])

  useFloorSubscription({
    onTableStatusChanged: handleTableStatusChanged,
    onNewReservation: handleNewReservation,
    onReservationCancelled: handleReservationCancelled,
    onLayoutPublished: handleLayoutPublished,
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
            <p className="bp__loading">LOADING...</p>
          ) : (
            <CustomerFloorPlan
              tables={tables}
              zones={zones}
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              selectedId={selectedTable?.public_id ?? null}
              onSelect={handleTableSelect}
              upcomingReservations={upcomingReservations}
              payload={layoutPayload}
            />
          ))}

        {tab === "bookings" && isAuthenticated && (
          <ActiveBookings
            reservations={reservations}
            loading={reservationsLoading}
            workingHours={workingHours}
            onRefresh={handleRefresh}
          />
        )}
      </div>

      {bookModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          restaurantId={public_restaurant_id ?? ""}
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
