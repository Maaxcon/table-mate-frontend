import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  DEFAULT_DURATION,
  DEFAULT_GUESTS,
  localDateKey,
  todayInTz,
} from "@/features/reservation/utils"
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
    reloadZones,
    layoutPayload,
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
  // (not "now"), and the booking modal opens prefilled with it. The venue's
  // timezone loads async, so this starts on the device's "today" and gets
  // corrected below once the real timezone is known.
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [slotTime, setSlotTime] = useState<string | null>(null)
  const [slotGuests, setSlotGuests] = useState(DEFAULT_GUESTS)
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null)
  const [availabilityNonce, setAvailabilityNonce] = useState(0)
  const [userPickedDate, setUserPickedDate] = useState(false)

  const handleSlotChange = useCallback(
    (next: { date?: Date; time?: string | null; guests?: number }) => {
      // Switching day clears the now-stale availability until the new slot loads.
      if (next.date !== undefined) {
        setUserPickedDate(true)
        setSlotDate(next.date)
        setAvailability(null)
      }
      if (next.time !== undefined) setSlotTime(next.time)
      if (next.guests !== undefined) setSlotGuests(next.guests)
    },
    [],
  )

  // Once the venue's timezone is known, snap the still-default date to the
  // venue's "today" — a device clock a day ahead/behind must not leave the
  // guest browsing (and querying availability for) the wrong working day.
  // Adjusted during render (not an effect) per React's guidance for state
  // that depends on a prop transition, so it lands in the same commit.
  const [syncedTimezone, setSyncedTimezone] = useState(timezone)
  if (timezone !== syncedTimezone) {
    setSyncedTimezone(timezone)
    if (timezone && !userPickedDate) {
      const venueToday = todayInTz(timezone)
      if (localDateKey(venueToday) !== localDateKey(slotDate)) {
        setSlotDate(venueToday)
        setAvailability(null)
      }
    }
  }

  useEffect(() => {
    if (!public_restaurant_id || !slotTime) return
    let cancelled = false
    // Probe the same default duration the booking modal opens with, so a table's
    // free/taken state on the map matches what the modal will accept.
    fetchSlotAvailability(public_restaurant_id, localDateKey(slotDate), slotTime, DEFAULT_DURATION)
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

  // Largest party the venue can seat = its biggest table. Caps the guest stepper
  // per restaurant; falls back to 20 until tables load.
  const maxGuests = useMemo(
    () => tables.reduce((m, t) => Math.max(m, t.capacity ?? 0), 0) || 20,
    [tables],
  )

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

  // Guests get no live floor updates (that WebSocket needs a staff token), so a
  // table a waiter just seated/booked in another tab would look stale here.
  // Refresh whenever the tab regains focus, but at most once every 10s so rapid
  // alt-tabbing doesn't spam the API. Only one refetch is ever needed: with a
  // slot picked, the floor's status comes entirely from slotAvailability, so
  // reloadTables() (tables + layout + upcoming reservations) would be wasted
  // work; without one, the fallback "now" status reads tables/upcoming instead,
  // and the availability effect no-ops anyway (it bails out without slotTime).
  const lastRefreshRef = useRef(0)
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "hidden") return
      const now = Date.now()
      if (now - lastRefreshRef.current < 10_000) return
      lastRefreshRef.current = now
      if (slotTime) {
        setAvailabilityNonce((n) => n + 1)
      } else {
        reloadTables()
      }
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [reloadTables, slotTime])

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

  const handleLayoutPublished = useCallback(() => {
    // reloadTables now refreshes tables + layout + upcoming in one call.
    reloadTables()
    // A publish may have added/removed a zone; refresh zones so its tab appears live.
    reloadZones()
  }, [reloadTables, reloadZones])

  const { isConnected } = useFloorSubscription({
    onTableStatusChanged: handleTableStatusChanged,
    onNewReservation: handleNewReservation,
    onReservationCancelled: handleReservationCancelled,
    onLayoutPublished: handleLayoutPublished,
    onZoneCreated: reloadZones,
    onZoneUpdated: reloadZones,
    onZoneDeleted: reloadZones,
    restaurantId: public_restaurant_id,
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
        {/* Live-updates dot only for authed guests — guests without a staff token
            get no floor WebSocket, so the indicator would always read offline. */}
        {isAuthenticated && (
          <span
            className={`bp__connection ${isConnected ? "bp__connection--connected" : ""}`}
            role="status"
            aria-label={isConnected ? "Connected" : "Disconnected"}
          />
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
                maxGuests={maxGuests}
                timeZone={timezone}
                onChange={handleSlotChange}
              />
              <CustomerFloorPlan
                tables={tables}
                zones={zones}
                selectedZone={selectedZone}
                onZoneChange={setSelectedZone}
                selectedId={selectedTable?.public_id ?? null}
                onSelect={handleTableSelect}
                upcomingReservations={upcomingReservations}
                slotAvailability={availability}
                guests={slotGuests}
                slotTime={slotTime}
                payload={layoutPayload}
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
