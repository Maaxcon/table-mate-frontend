import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { LuArrowLeft } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import { ActiveBookings } from "@/features/reservation/ActiveBookings"
import { BookModal } from "@/features/reservation/BookModal"
import { CustomerFloorPlan } from "@/features/reservation/CustomerFloorPlan"
import { FloorSlotPicker } from "@/features/reservation/FloorSlotPicker"
import { LoginCtaModal } from "@/features/reservation/LoginCtaModal"
import { FloorPlanSkeleton } from "@/features/reservation/BookingSkeleton"
import { fetchSlotAvailability } from "@/features/reservation/api"
import { localDateKey } from "@/features/reservation/utils"
import { bookStrings } from "@/features/reservation/strings"
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
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  const goToMenu = useCallback(() => {
    if (public_restaurant_id) navigate(`/menu/${public_restaurant_id}`)
    else navigate(-1)
  }, [navigate, public_restaurant_id])
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

  // Slot the guest is browsing for. Table statuses on the floor reflect this slot
  // (not "now"), and the booking modal opens prefilled with it.
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [slotTime, setSlotTime] = useState<string | null>(null)
  const [slotGuests, setSlotGuests] = useState(2)
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null)
  const [availabilityNonce, setAvailabilityNonce] = useState(0)

  const handleSlotChange = useCallback(
    (next: { date?: Date; time?: string | null; guests?: number }) => {
      // Switching day clears the now-stale availability until the new slot loads.
      if (next.date !== undefined) {
        setSlotDate(next.date)
        setAvailability(null)
      }
      if (next.time !== undefined) setSlotTime(next.time)
      if (next.guests !== undefined) setSlotGuests(next.guests)
    },
    [],
  )

  useEffect(() => {
    if (!public_restaurant_id || !slotTime) return
    let cancelled = false
    fetchSlotAvailability(public_restaurant_id, localDateKey(slotDate), slotTime)
      .then((a) => {
        if (!cancelled) setAvailability(a)
      })
      .catch(() => {
        if (!cancelled) setAvailability(null)
      })
    return () => {
      cancelled = true
    }
  }, [public_restaurant_id, slotDate, slotTime, availabilityNonce])

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
    setAvailabilityNonce((n) => n + 1)
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
      setAvailabilityNonce((n) => n + 1)
    },
    [setUpcomingReservations],
  )

  const handleReservationCancelled = useCallback(
    (event: FloorReservationCancelledEvent) => {
      setUpcomingReservations((prev) => prev.filter((r) => r.public_id !== event.reservation_id))
      setAvailabilityNonce((n) => n + 1)
    },
    [setUpcomingReservations],
  )

  useFloorSubscription({
    restaurantId: public_restaurant_id,
    onTableStatusChanged: handleTableStatusChanged,
    onNewReservation: handleNewReservation,
    onReservationCancelled: handleReservationCancelled,
  })

  return (
    <div className="bp">
      <header className="bp__topbar">
        <button type="button" className="bp__back" onClick={goToMenu}>
          <LuArrowLeft aria-hidden="true" />
          <span>{bookStrings.backToMenu}</span>
        </button>
        <span className="bp__topbar-title">{bookStrings.pageTitle}</span>
        <span className="bp__topbar-spacer" aria-hidden="true" />
      </header>

      <div className="bp__tabs">
        <button
          type="button"
          className={["bp__tab", tab === "floor" ? "bp__tab--active" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setTab("floor")}
        >
          {bookStrings.tabs.floor}
        </button>
        {isAuthenticated && (
          <button
            type="button"
            className={["bp__tab", tab === "bookings" ? "bp__tab--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab("bookings")}
          >
            {bookStrings.tabs.bookings}
          </button>
        )}
      </div>

      <div className="bp__content">
        {tab === "floor" &&
          (tablesLoading ? (
            <FloorPlanSkeleton />
          ) : tablesError ? (
            <div className="bp__error" role="alert">
              <p className="bp__error-text">{bookStrings.errors.floor}</p>
              <button type="button" className="bp__retry" onClick={reloadTables}>
                {bookStrings.retry}
              </button>
            </div>
          ) : (
            <div className="bp__floor">
              <FloorSlotPicker
                workingHours={workingHours}
                date={slotDate}
                time={slotTime}
                guests={slotGuests}
                onChange={handleSlotChange}
              />
              <CustomerFloorPlan
                tables={filteredTables}
                zones={zones}
                selectedZone={selectedZone}
                onZoneChange={setSelectedZone}
                selectedId={selectedTable?.public_id ?? null}
                onSelect={handleTableSelect}
                upcomingReservations={upcomingReservations}
                slotAvailability={availability}
                guests={slotGuests}
              />
            </div>
          ))}

        {tab === "bookings" &&
          isAuthenticated &&
          (reservationsError ? (
            <div className="bp__error" role="alert">
              <p className="bp__error-text">{bookStrings.errors.bookings}</p>
              <button type="button" className="bp__retry" onClick={reloadReservations}>
                {bookStrings.retry}
              </button>
            </div>
          ) : (
            <ActiveBookings
              reservations={reservations}
              loading={reservationsLoading}
              workingHours={workingHours}
              timeZone={timezone}
              restaurantId={public_restaurant_id}
              onRefresh={reloadReservations}
              onBrowseTables={() => setTab("floor")}
            />
          ))}
      </div>

      {bookModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          timeZone={timezone}
          initialDate={slotDate}
          initialTime={slotTime}
          initialGuests={slotGuests}
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
