import { useCallback, useEffect, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { ReservationWithTable, WorkingHoursDay } from "./api"
import { fetchMyReservations, fetchRestaurantSettings, fetchTables } from "./api"
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
    loadReservations()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadTables, loadSettings, loadReservations])

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
              tables={tables}
              selectedId={selectedTable?.public_id ?? null}
              onSelect={handleTableSelect}
            />
          ))}

        {tab === "bookings" && (
          <ActiveBookings
            reservations={reservations}
            loading={reservationsLoading}
            onRefresh={handleRefresh}
          />
        )}

        {!restaurantId && tab === "floor" && null}
      </div>

      {bookModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
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
