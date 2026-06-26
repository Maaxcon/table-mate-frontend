import { useCallback, useState } from "react"
import { useParams } from "react-router-dom"
import type { Table } from "@/types/api/types.gen"
import { ActiveBookings } from "@/features/reservation/ActiveBookings"
import { BookModal } from "@/features/reservation/BookModal"
import { CustomerFloorPlan } from "@/features/reservation/CustomerFloorPlan"
import { LoginCtaModal } from "@/features/reservation/LoginCtaModal"
import { useBookingData } from "@/features/reservation/hooks/useBookingData"
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

  const {
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
  } = useBookingData(public_restaurant_id, isAuthenticated)

  const [tab, setTab] = useState<Tab>("floor")
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [loginCtaOpen, setLoginCtaOpen] = useState(false)

  const filteredTables = selectedZone
    ? tables.filter((t) => t.zone?.public_id === selectedZone)
    : tables

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
    reloadTables()
    reloadReservations()
  }, [reloadTables, reloadReservations])

  const handleTableStatusChanged = useCallback(
    (event: FloorTableStatusEvent) => {
      const isOccupied = event.current_status === "occupied"
      setTables((prev) =>
        prev.map((t) => (t.public_id === event.table_id ? { ...t, is_occupied: isOccupied } : t)),
      )
    },
    [setTables],
  )

  const handleNewReservation = useCallback(
    (event: FloorNewReservationEvent) => {
      setUpcomingReservations((prev) => [
        ...prev,
        {
          public_id: event.reservation_id,
          table_id: event.table_id,
          start_at: event.start_at,
        },
      ])
    },
    [setUpcomingReservations],
  )

  const handleReservationCancelled = useCallback(
    (event: FloorReservationCancelledEvent) => {
      setUpcomingReservations((prev) => prev.filter((r) => r.public_id !== event.reservation_id))
    },
    [setUpcomingReservations],
  )

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
              <button type="button" className="bp__retry" onClick={reloadTables}>
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
              <button type="button" className="bp__retry" onClick={reloadReservations}>
                Try again
              </button>
            </div>
          ) : (
            <ActiveBookings
              reservations={reservations}
              loading={reservationsLoading}
              workingHours={workingHours}
              onRefresh={reloadReservations}
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
