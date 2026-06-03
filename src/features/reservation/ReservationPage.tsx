import { useCallback, useEffect, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { ReservationWithTable, WorkingHoursDay, Zone } from "./api"
import { fetchMyReservations, fetchRestaurantSettings, fetchTables, fetchZones } from "./api"
import { ActiveBookings } from "./ActiveBookings"
import { BookModal } from "./BookModal"
import { CustomerFloorPlan } from "./CustomerFloorPlan"
import "./ReservationPage.css"

type Tab = "floor" | "bookings"

interface ReservationPageProps {
  restaurantId?: string
}

export function ReservationPage({ restaurantId }: ReservationPageProps) {
  const [tab, setTab] = useState<Tab>(restaurantId ? "floor" : "bookings")

  const [tables, setTables] = useState<Table[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)

  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [bookModalOpen, setBookModalOpen] = useState(false)

  const [reservations, setReservations] = useState<ReservationWithTable[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)

  const loadTables = useCallback(async () => {
    if (!restaurantId) {
      setTables([])
      setTablesLoading(false)
      return
    }
    setTablesLoading(true)
    try {
      const data = await fetchTables(restaurantId)
      setTables(data)
    } catch {
      setTables([])
    } finally {
      setTablesLoading(false)
    }
  }, [restaurantId])

  const loadSettings = useCallback(async () => {
    if (!restaurantId) {
      setWorkingHours(null)
      return
    }
    try {
      const settings = await fetchRestaurantSettings(restaurantId)
      setWorkingHours(settings.working_hours)
    } catch {
      setWorkingHours(null)
    }
  }, [restaurantId])

  const loadZones = useCallback(async () => {
    if (!restaurantId) {
      setZones([])
      setSelectedZone(null)
      return
    }
    try {
      const data = await fetchZones(restaurantId)
      setZones(data)
      setSelectedZone((current) => current ?? data[0]?.public_id ?? null)
    } catch {
      setZones([])
      setSelectedZone(null)
    }
  }, [restaurantId])

  const loadReservations = useCallback(async () => {
    setReservationsLoading(true)
    try {
      const data = await fetchMyReservations(restaurantId)
      setReservations(data)
    } catch {
      setReservations([])
    } finally {
      setReservationsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    loadTables()
    loadSettings()
    loadZones()
    loadReservations()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadTables, loadSettings, loadZones, loadReservations])

  const handleTableSelect = useCallback((table: Table) => {
    setSelectedTable(table)
    setBookModalOpen(true)
  }, [])

  const handleBookingSuccess = useCallback(() => {
    setBookModalOpen(false)
    setSelectedTable(null)
    loadTables()
    loadReservations()
  }, [loadTables, loadReservations])

  const handleRefresh = useCallback(() => {
    loadReservations()
  }, [loadReservations])

  const visibleTables =
    selectedZone === null
      ? tables
      : tables.filter((table) => table.zone?.public_id === selectedZone)

  return (
    <div className="rp">
      {restaurantId && (
        <div className="rp__tabs">
          <button
            type="button"
            className={["rp__tab", tab === "floor" ? "rp__tab--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab("floor")}
          >
            FLOOR PLAN
          </button>
          <button
            type="button"
            className={["rp__tab", tab === "bookings" ? "rp__tab--active" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab("bookings")}
          >
            MY BOOKINGS
          </button>
        </div>
      )}

      <div className="rp__content">
        {tab === "floor" &&
          restaurantId &&
          (tablesLoading ? (
            <p className="rp__loading">LOADING...</p>
          ) : (
            <CustomerFloorPlan
              tables={visibleTables}
              zones={zones}
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              selectedId={selectedTable?.public_id ?? null}
              onSelect={handleTableSelect}
            />
          ))}

        {tab === "bookings" && (
          <ActiveBookings
            reservations={reservations}
            loading={reservationsLoading}
            workingHours={workingHours}
            onRefresh={handleRefresh}
          />
        )}

        {!restaurantId && tab === "floor" && null}
      </div>

      {bookModalOpen && selectedTable && restaurantId && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          restaurantId={restaurantId}
          onClose={() => {
            setBookModalOpen(false)
            setSelectedTable(null)
          }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}
