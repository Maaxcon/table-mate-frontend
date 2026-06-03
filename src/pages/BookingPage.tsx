import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Table } from "@/types/api/types.gen"
import type { ReservationWithTable, WorkingHoursDay, Zone } from "@/features/reservation/api"
import {
  fetchMyReservations,
  fetchRestaurantSettings,
  fetchTables,
  fetchZones,
} from "@/features/reservation/api"
import { ActiveBookings } from "@/features/reservation/ActiveBookings"
import { BookModal } from "@/features/reservation/BookModal"
import { CustomerFloorPlan } from "@/features/reservation/CustomerFloorPlan"
import { LoginCtaModal } from "@/features/reservation/LoginCtaModal"
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

  const loadTables = useCallback(async () => {
    if (!public_restaurant_id) return
    setTablesLoading(true)
    try {
      const data = await fetchTables(public_restaurant_id)
      setTables(data)
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

  const filteredTables = selectedZone
    ? tables.filter(
        (t) => (t as Table & { zone?: { public_id: string } }).zone?.public_id === selectedZone,
      )
    : tables

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
              tables={filteredTables}
              zones={zones}
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              selectedId={selectedTable?.public_id ?? null}
              onSelect={handleTableSelect}
            />
          ))}

        {tab === "bookings" && isAuthenticated && (
          <ActiveBookings
            reservations={reservations}
            loading={reservationsLoading}
            onRefresh={handleRefresh}
          />
        )}
      </div>

      {bookModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          restaurantId={public_restaurant_id ?? ""}
          onRefreshTables={loadTables}
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
