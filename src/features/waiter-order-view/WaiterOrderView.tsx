import { useEffect, useState } from "react"
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
} from "./data/waiterTypes"
import { getTableVisualStatus } from "./data/waiterTypes"
import { apiFetch } from "@/api/client"
import type { LayoutResponse, Table } from "@/types/api"
import "./WaiterOrderView.css"

interface ZoneApiResponse {
  public_id: string
  name: string
  sort_order: number
}

function mapTableToFloorTable(t: Table): FloorTable {
  return {
    public_id: t.public_id,
    table_number: t.table_number,
    capacity: t.capacity,
    shape: t.shape as FloorTable["shape"],
    is_occupied: t.is_occupied ?? false,
    position_x: t.position_x ?? null,
    position_y: t.position_y ?? null,
    active: t.active ?? true,
    zone: t.zone ?? null,
  }
}

interface ReservationApiItem {
  public_id: string
  start_at: string
  table_info: { table_number: string } | null
  guest_count: number
  status: string
  notes?: string | null
  customer_name?: string
}

function mapReservationItem(r: ReservationApiItem): ReservationItem {
  return {
    public_id: r.public_id,
    start_at: r.start_at,
    table: r.table_info?.table_number ?? "",
    guest_count: r.guest_count,
    status: r.status as ReservationItem["status"],
    notes: r.notes,
    name: r.customer_name ?? "Guest",
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
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      apiFetch(`/api/restaurants/tables/layout/`, {
        signal: controller.signal,
      }),
      apiFetch(`/api/restaurants/zones/`, { signal: controller.signal }),
    ])
      .then(async ([layoutRes, zonesRes]) => {
        if (!layoutRes.ok) throw new Error("Failed to load tables")
        const layoutData = (await layoutRes.json()) as LayoutResponse
        const items = layoutData.tables ?? []
        setTables(items.map(mapTableToFloorTable))
        setLayoutReservations(layoutData.upcoming_reservations ?? [])
        if (zonesRes.ok) {
          const zonesData = (await zonesRes.json()) as { results?: ZoneApiResponse[] }
          const zonesList = zonesData.results ?? []
          setZones(zonesList)
          if (zonesList.length > 0) setSelectedZoneId(zonesList[0].public_id)
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Failed to load data")
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiFetch(`/api/reservations/reservations/?status=pending&status=active`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { results?: ReservationApiItem[] }
        setReservations((data.results ?? []).map(mapReservationItem))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refreshFloor = async () => {
    try {
      const [layoutRes, resvRes] = await Promise.all([
        apiFetch(`/api/restaurants/tables/layout/`),
        apiFetch(`/api/reservations/reservations/?status=pending&status=active`),
      ])
      if (layoutRes.ok) {
        const layoutData = (await layoutRes.json()) as LayoutResponse
        setTables((layoutData.tables ?? []).map(mapTableToFloorTable))
        setLayoutReservations(layoutData.upcoming_reservations ?? [])
      }
      if (resvRes.ok) {
        const data = (await resvRes.json()) as { results?: ReservationApiItem[] }
        setReservations((data.results ?? []).map(mapReservationItem))
      }
    } catch {
      // keep current state on refresh failure
    }
  }

  const closeOverlay = () => {
    setSelectedTableId(null)
    setOverlayDetail(null)
    setActionError(null)
  }

  const runTableAction = async (request: () => Promise<Response>, fallbackMsg: string) => {
    setActionBusy(true)
    setActionError(null)
    try {
      const res = await request()
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail ?? fallbackMsg)
      }
      await refreshFloor()
      closeOverlay()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallbackMsg)
    } finally {
      setActionBusy(false)
    }
  }

  const handleOpenTable = (guestCount: number) => {
    if (!selectedTableId) return
    void runTableAction(
      () =>
        apiFetch(`/api/orders/sessions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: selectedTableId, guest_count: guestCount }),
        }),
      "Failed to open table",
    )
  }

  const handleActivateReservation = (reservationId: string) => {
    void runTableAction(
      () =>
        apiFetch(`/api/reservations/reservations/${reservationId}/activate/`, {
          method: "POST",
        }),
      "Failed to activate reservation",
    )
  }

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

      const ordersRes = await apiFetch(
        `/api/orders/orders/?session__public_id=${session.public_id}`,
      )
      let orders: Array<{
        public_id: string
        currency: string
        total_amount: string
        tax_total: string
        discount_total?: string
        service_charge?: string
      }> = []
      if (ordersRes.ok) {
        const orderData = (await ordersRes.json()) as {
          results?: Array<{
            public_id: string
            currency: string
            total_amount: string
            tax_total: string
            discount_total?: string
            service_charge?: string
          }>
        }
        orders = orderData.results ?? []
      }

      if (orders.length === 0) {
        setOverlayLoading(false)
        return
      }

      // A visit can have several Orders (one per checkout round) on the same
      // Session — gather items from all of them, not just the latest.
      const itemsPerOrder = await Promise.all(
        orders.map(async (o) => {
          const oiRes = await apiFetch(`/api/orders/order-items/?order__public_id=${o.public_id}`)
          if (!oiRes.ok) return [] as OverlayOrderItem[]
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
          return (oiData.results ?? []).map((oi) => ({
            public_id: oi.public_id,
            guest_slot: oi.guest_slot,
            quantity: oi.quantity,
            name: oi.menu_item_name ?? oi.public_id,
            unit_price: oi.unit_price,
            status: oi.status as OverlayOrderItem["status"],
            is_wasted: oi.is_wasted,
            void_reason: oi.void_reason,
          }))
        }),
      )
      const orderItems = itemsPerOrder.flat()

      const selTable = currentTables.find((t) => t.public_id === tablePublicId)
      const resForTable = currentReservations.find((r) => r.table === selTable?.table_number)

      const rawSubtotal = orderItems.reduce(
        (sum, item) => sum + parseFloat(item.unit_price) * item.quantity,
        0,
      )
      const rawTax = orders.reduce((sum, o) => sum + parseFloat(o.tax_total || "0"), 0)
      const rawDiscount = orders.reduce((sum, o) => sum + parseFloat(o.discount_total || "0"), 0)
      const rawServiceCharge = orders.reduce(
        (sum, o) => sum + parseFloat(o.service_charge || "0"),
        0,
      )
      const rawTotal = rawSubtotal + rawTax - rawDiscount + rawServiceCharge

      setOverlayDetail({
        public_id: session.public_id,
        table_number: selTable?.table_number ?? "",
        guest_name: resForTable?.name ?? "Guest",
        guest_count: session.guest_count,
        duration,
        currency: orders[0].currency,
        items: orderItems,
        subtotal: rawSubtotal.toFixed(2),
        tax_total: rawTax.toFixed(2),
        total_amount: rawTotal.toFixed(2),
        discount_total: rawDiscount.toFixed(2),
        service_charge: rawServiceCharge.toFixed(2),
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

  const visualOccupiedCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "occupied",
  ).length
  const visualReservedCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "reserved",
  ).length
  const visualFreeCount = tables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "free",
  ).length
  const selectedTableVisualStatus = selectedTable
    ? getTableVisualStatus(selectedTable, layoutReservations, currentTime)
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
              currentTime={currentTime}
              onSelect={handleTableSelect}
            />
          ) : (
            <div className="waiter-view__placeholder">
              <p>{activeTab} view — not yet implemented</p>
            </div>
          )}
        </div>

        {showFloorPlan && <ReservationSidebar reservations={reservations} />}
      </div>

      {selectedTable && (
        <TableDetailOverlay
          table={selectedTable}
          detail={overlayDetail}
          tableReservations={selectedTableReservations}
          visualStatus={selectedTableVisualStatus}
          loading={overlayLoading}
          actionBusy={actionBusy}
          actionError={actionError}
          onOpenTable={handleOpenTable}
          onActivateReservation={handleActivateReservation}
          onClose={closeOverlay}
        />
      )}
    </div>
  )
}
