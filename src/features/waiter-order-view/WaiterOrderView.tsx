import { useEffect, useState, useCallback, useMemo } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import type {
  FloorTable,
  ReservationItem,
  OverlayDetail,
  OverlayOrderItem,
  UpcomingReservation,
  TableReservationInfo,
  TableSessionInfo,
} from "./data/waiterTypes"
import { getTableVisualStatus } from "./data/waiterTypes"
import { useHallSubscription } from "./hooks/useHallSubscription"
import type {
  HallTableStatusChangedEvent,
  HallNewReservationEvent,
} from "./hooks/useHallSubscription"
import { BookModal } from "@/features/reservation/BookModal"
import { RescheduleModal } from "@/features/reservation/RescheduleModal"
import type { WorkingHoursDay } from "@/features/reservation/api"
import { cancelReservation, fetchRestaurantSettings } from "@/features/reservation/api"
import { useAppSelector } from "@/store/hooks"
import { apiFetch } from "@/api/client"
import "./WaiterOrderView.css"

interface TableApiResponse {
  public_id: string
  table_number: string
  capacity: number
  shape: string
  is_occupied: boolean
  active: boolean
  position_x: number | null
  position_y: number | null
  zone?: { public_id: string; name: string } | null
}

interface ZoneApiResponse {
  public_id: string
  name: string
  sort_order: number
}

function mapTableToFloorTable(t: TableApiResponse): FloorTable {
  return {
    public_id: t.public_id,
    table_number: t.table_number,
    capacity: t.capacity,
    shape: t.shape as FloorTable["shape"],
    is_occupied: t.is_occupied,
    position_x: t.position_x,
    position_y: t.position_y,
    active: t.active,
    zone: t.zone ?? null,
  }
}

export function WaiterOrderView() {
  const [activeTab, setActiveTab] = useState("FLOOR PLAN")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tables, setTables] = useState<FloorTable[]>([])
  const [zones, setZones] = useState<ZoneApiResponse[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [layoutReservations, setLayoutReservations] = useState<UpcomingReservation[]>([])
  const [overlayDetail, setOverlayDetail] = useState<OverlayDetail | null>(null)
  const [overlayLoading, setOverlayLoading] = useState(false)

  const [showBookModal, setShowBookModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState<ReservationItem | null>(null)
  const [sidebarActionLoading, setSidebarActionLoading] = useState(false)
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)

  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)

  const enrichTablesWithSessionData = useCallback(
    async (tablesData: FloorTable[], signal?: AbortSignal): Promise<FloorTable[]> => {
      const occupiedTables = tablesData.filter((t) => t.is_occupied)
      if (occupiedTables.length === 0) return tablesData

      const enrichedTables = [...tablesData]

      await Promise.all(
        occupiedTables.map(async (table) => {
          try {
            const sessionRes = await apiFetch(
              `/api/orders/sessions/?table__public_id=${table.public_id}&status=open`,
              { signal },
            )
            if (!sessionRes.ok) return

            const sessionData = (await sessionRes.json()) as {
              results?: Array<{
                public_id: string
                opened_at: string
                guest_count: number
              }>
            }
            const session = (sessionData.results ?? [])[0]
            if (!session) return

            const idx = enrichedTables.findIndex((t) => t.public_id === table.public_id)
            if (idx !== -1) {
              enrichedTables[idx] = {
                ...enrichedTables[idx],
                activeSession: {
                  public_id: session.public_id,
                  opened_at: session.opened_at,
                  guest_count: session.guest_count,
                },
              }
            }
          } catch {
            // Skip failed enrichment for this table
          }
        }),
      )

      return enrichedTables
    },
    [],
  )

  const fetchSessionForTable = useCallback(
    async (tablePublicId: string): Promise<TableSessionInfo | null> => {
      try {
        const sessionRes = await apiFetch(
          `/api/orders/sessions/?table__public_id=${tablePublicId}&status=open`,
        )
        if (!sessionRes.ok) return null

        const sessionData = (await sessionRes.json()) as {
          results?: Array<{
            public_id: string
            opened_at: string
            guest_count: number
          }>
        }
        const session = (sessionData.results ?? [])[0]
        if (!session) return null

        return {
          public_id: session.public_id,
          opened_at: session.opened_at,
          guest_count: session.guest_count,
        }
      } catch {
        return null
      }
    },
    [],
  )

  const handleTableStatusChanged = useCallback(
    async (event: HallTableStatusChangedEvent) => {
      const isOccupied = event.current_status === "occupied"

      if (isOccupied) {
        const sessionInfo = await fetchSessionForTable(event.table_id)
        setTables((prev) =>
          prev.map((t) => {
            if (t.public_id !== event.table_id) return t
            return {
              ...t,
              is_occupied: true,
              activeSession: sessionInfo,
              activeReservation: null,
            }
          }),
        )
      } else {
        setTables((prev) =>
          prev.map((t) => {
            if (t.public_id !== event.table_id) return t
            return {
              ...t,
              is_occupied: false,
              activeSession: null,
              activeReservation: null,
            }
          }),
        )
      }
    },
    [fetchSessionForTable],
  )

  const handleNewReservation = useCallback((event: HallNewReservationEvent) => {
    setLayoutReservations((prev) => [
      ...prev,
      {
        public_id: event.reservation_id,
        table_id: event.table_id,
        start_at: event.start_at,
      },
    ])
  }, [])

  useHallSubscription({
    onTableStatusChanged: handleTableStatusChanged,
    onNewReservation: handleNewReservation,
  })

  useEffect(() => {
    if (!restaurantId) return
    fetchRestaurantSettings(restaurantId)
      .then((settings) => setWorkingHours(settings.working_hours))
      .catch(() => setWorkingHours(null))
  }, [restaurantId])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [layoutRes, zonesRes, pendingRes, activeRes] = await Promise.all([
        apiFetch(`/api/restaurants/tables/layout/`),
        apiFetch(`/api/restaurants/zones/`),
        apiFetch(`/api/reservations/reservations/?status=pending`),
        apiFetch(`/api/reservations/reservations/?status=active`),
      ])

      if (!layoutRes.ok) throw new Error("Failed to load tables")
      const layoutData = (await layoutRes.json()) as {
        tables: TableApiResponse[]
        upcoming_reservations: Array<{ public_id: string; table_id: string; start_at: string }>
      }
      const items = layoutData.tables ?? []
      const mappedTables = items.map(mapTableToFloorTable)
      setLayoutReservations(layoutData.upcoming_reservations ?? [])

      if (zonesRes.ok) {
        const zonesData = (await zonesRes.json()) as { results?: ZoneApiResponse[] }
        const zonesList = zonesData.results ?? []
        setZones(zonesList)
        if (zonesList.length > 0 && !selectedZoneId) setSelectedZoneId(zonesList[0].public_id)
      }

      const parseReservationResponse = async (res: Response) => {
        if (!res.ok) return []
        const data = (await res.json()) as {
          results?: Array<{
            public_id: string
            start_at: string
            table_info: { table_number: string } | null
            guest_count: number
            status: string
            notes?: string | null
            customer_name?: string
            customer?: string | null
          }>
        }
        return (data.results ?? []).map((r) => ({
          public_id: r.public_id,
          start_at: r.start_at,
          table: r.table_info?.table_number ?? "",
          guest_count: r.guest_count,
          status: r.status as "pending" | "active",
          notes: r.notes,
          name: r.customer_name ?? "Guest",
          customer: r.customer ?? null,
        }))
      }

      const [pendingItems, activeItems] = await Promise.all([
        parseReservationResponse(pendingRes),
        parseReservationResponse(activeRes),
      ])
      const reservationItems = [...pendingItems, ...activeItems]
      setReservations(reservationItems)

      const tablesWithReservations = mappedTables.map((table) => {
        const matchingReservation = reservationItems.find(
          (r) => r.table === table.table_number && r.status === "pending",
        )
        if (matchingReservation) {
          return {
            ...table,
            activeReservation: {
              public_id: matchingReservation.public_id,
              guest_name: matchingReservation.name,
              guest_count: matchingReservation.guest_count,
              start_at: matchingReservation.start_at,
            } as TableReservationInfo,
          }
        }
        return table
      })

      const enrichedTables = await enrichTablesWithSessionData(tablesWithReservations)
      setTables(enrichedTables)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [enrichTablesWithSessionData, selectedZoneId])

  useEffect(() => {
    loadData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadData])

  const handleCancelReservation = useCallback(
    async (reservationId: string) => {
      setSidebarActionLoading(true)
      try {
        await cancelReservation(reservationId)
        await loadData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel reservation")
      } finally {
        setSidebarActionLoading(false)
      }
    },
    [loadData],
  )

  const handleModifyReservation = useCallback((reservation: ReservationItem) => {
    setEditingReservation(reservation)
  }, [])

  const excludeReservationIds = useMemo(() => {
    if (!editingReservation) return undefined
    if (editingReservation.customer) {
      return reservations
        .filter((r) => r.customer === editingReservation.customer)
        .map((r) => r.public_id)
    }
    return [editingReservation.public_id]
  }, [editingReservation, reservations])

  const buildOverlayDetail = async (
    tablePublicId: string,
    currentTables: FloorTable[],
    currentReservations: ReservationItem[],
  ) => {
    setOverlayLoading(true)
    setOverlayDetail(null)

    try {
      const sessionRes = await apiFetch(
        `/api/orders/sessions/?table__public_id=${tablePublicId}&status=open`,
      )
      if (!sessionRes.ok) {
        setOverlayLoading(false)
        return
      }
      const sessionData = (await sessionRes.json()) as {
        results?: Array<{
          public_id: string
          table: string
          guest_count: number
          opened_at: string
          status: string
        }>
      }
      const session = (sessionData.results ?? [])[0]
      if (!session) {
        setOverlayLoading(false)
        return
      }
      const openedAt = new Date(session.opened_at)
      const durationMinutes = Math.round((Date.now() - openedAt.getTime()) / 60000)
      const duration =
        durationMinutes > 60
          ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60}m`
          : `${durationMinutes}m`

      const orderRes = await apiFetch(`/api/orders/orders/?session__public_id=${session.public_id}`)
      let orderItems: OverlayOrderItem[] = []
      let order: {
        public_id: string
        currency: string
        total_amount: string
        tax_total: string
        discount_total?: string
        service_charge?: string
      } | null = null

      if (orderRes.ok) {
        const orderData = (await orderRes.json()) as {
          results?: Array<{
            public_id: string
            session: string
            currency: string
            total_amount: string
            tax_total: string
            discount_total?: string
            service_charge?: string
          }>
        }
        order = (orderData.results ?? [])[0] ?? null

        if (order) {
          const oiRes = await apiFetch(
            `/api/orders/order-items/?order__public_id=${order.public_id}`,
          )
          if (oiRes.ok) {
            const oiData = (await oiRes.json()) as {
              results?: Array<{
                public_id: string
                guest_slot: number
                quantity: number
                status: string
                is_wasted: boolean
                void_reason?: number | null
                unit_price: string
                menu_item_name?: string
              }>
            }
            orderItems = (oiData.results ?? []).map((oi) => ({
              public_id: oi.public_id,
              guest_slot: oi.guest_slot,
              quantity: oi.quantity,
              name: oi.menu_item_name ?? oi.public_id,
              unit_price: oi.unit_price,
              status: oi.status as OverlayOrderItem["status"],
              is_wasted: oi.is_wasted,
              void_reason: oi.void_reason,
            }))
          }
        }
      }

      if (!order) {
        setOverlayLoading(false)
        return
      }

      const selTable = currentTables.find((t) => t.public_id === tablePublicId)
      const resForTable = currentReservations.find((r) => r.table === selTable?.table_number)

      const rawSubtotal = orderItems.reduce(
        (sum, item) => sum + parseFloat(item.unit_price) * item.quantity,
        0,
      )
      const rawTax = parseFloat(order.tax_total)
      const rawDiscount = parseFloat(order.discount_total || "0")
      const rawServiceCharge = parseFloat(order.service_charge || "0")
      const rawTotal = rawSubtotal + rawTax - rawDiscount + rawServiceCharge

      setOverlayDetail({
        public_id: order.public_id,
        table_number: selTable?.table_number ?? "",
        guest_name: resForTable?.name ?? "Guest",
        guest_count: session.guest_count,
        duration,
        currency: order.currency,
        items: orderItems,
        subtotal: rawSubtotal.toFixed(2),
        tax_total: order.tax_total,
        total_amount: rawTotal.toFixed(2),
        discount_total: order.discount_total,
        service_charge: order.service_charge,
      })
    } finally {
      setOverlayLoading(false)
    }
  }

  const filteredTables = selectedZoneId
    ? tables.filter((t) => t.zone?.public_id === selectedZoneId)
    : tables

  const selectedTable = selectedTableId
    ? (filteredTables.find((t) => t.public_id === selectedTableId) ?? null)
    : null

  const selectedTableReservations = selectedTable
    ? reservations.filter((r) => r.table === selectedTable.table_number)
    : []

  const handleTableSelect = (table: FloorTable) => {
    setSelectedTableId(table.public_id)
    if (table.is_occupied) {
      buildOverlayDetail(table.public_id, tables, reservations)
    } else {
      setOverlayDetail(null)
      setOverlayLoading(false)
    }
  }

  const showFloorPlan = activeTab === "FLOOR PLAN"

  const now = new Date()
  const visualOccupiedCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, now) === "occupied",
  ).length
  const visualReservedCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, now) === "reserved",
  ).length
  const visualFreeCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, now) === "free",
  ).length
  const selectedTableVisualStatus = selectedTable
    ? getTableVisualStatus(selectedTable, layoutReservations, now)
    : "free"

  if (loading)
    return (
      <div className="waiter-view">
        <p className="waiter-view__message">Loading floor plan…</p>
      </div>
    )
  if (error)
    return (
      <div className="waiter-view">
        <p className="waiter-view__message waiter-view__message--error">{error}</p>
      </div>
    )

  return (
    <div className="waiter-view">
      <TopNav
        occupiedCount={visualOccupiedCount}
        reservedCount={visualReservedCount}
        freeCount={visualFreeCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {zones.length > 1 && (
        <div className="waiter-view__zones">
          {zones.map((z) => (
            <button
              key={z.public_id}
              type="button"
              className={`waiter-view__zone ${selectedZoneId === z.public_id ? "waiter-view__zone--active" : ""}`}
              onClick={() => setSelectedZoneId(z.public_id)}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      <div className="waiter-view__layout">
        <div className="waiter-view__main">
          {showFloorPlan ? (
            <FloorPlan
              tables={filteredTables}
              selectedId={selectedTableId}
              upcomingReservations={layoutReservations}
              onSelect={handleTableSelect}
            />
          ) : (
            <div className="waiter-view__placeholder">
              <p>{activeTab} view — not yet implemented</p>
            </div>
          )}
        </div>

        {showFloorPlan && (
          <ReservationSidebar
            reservations={reservations.filter((r) => r.status === "pending")}
            onAdd={() => setShowBookModal(true)}
            onCancel={handleCancelReservation}
            onModify={handleModifyReservation}
            actionLoading={sidebarActionLoading}
          />
        )}
      </div>

      {selectedTable && (
        <TableDetailOverlay
          table={selectedTable}
          detail={overlayDetail}
          tableReservations={selectedTableReservations}
          visualStatus={selectedTableVisualStatus}
          loading={overlayLoading}
          allTables={tables}
          allReservations={reservations}
          upcomingReservations={layoutReservations}
          onClose={() => {
            setSelectedTableId(null)
            setOverlayDetail(null)
          }}
          onRefresh={loadData}
        />
      )}

      {showBookModal && tables.length > 0 && (
        <BookModal
          table={tables[0]}
          workingHours={workingHours}
          restaurantId={restaurantId ?? ""}
          onClose={() => setShowBookModal(false)}
          onSuccess={() => {
            setShowBookModal(false)
            loadData()
          }}
        />
      )}

      {editingReservation && (
        <RescheduleModal
          publicId={editingReservation.public_id}
          tableNumber={editingReservation.table}
          tablePublicId={
            tables.find((t) => t.table_number === editingReservation.table)?.public_id ?? ""
          }
          currentDate={editingReservation.start_at}
          currentStart={editingReservation.start_at}
          currentEnd={editingReservation.start_at}
          currentGuests={editingReservation.guest_count}
          tableCapacity={
            tables.find((t) => t.table_number === editingReservation.table)?.capacity ?? 10
          }
          restaurantId={restaurantId ?? undefined}
          workingHours={workingHours}
          excludeReservationIds={excludeReservationIds}
          onClose={() => setEditingReservation(null)}
          onSuccess={() => {
            setEditingReservation(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
