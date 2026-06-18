import { useCallback, useEffect, useState } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import { useTableActions } from "./hooks/useTableActions"
import type {
  FloorTable,
  ReservationItem,
  OverlayDetail,
  UpcomingReservation,
} from "./data/waiterTypes"
import { getTableVisualStatus } from "./data/waiterTypes"
import { fetchOverlayDetail, fetchReservations } from "./data/waiterApi"
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
    fetchReservations(controller.signal)
      .then((items) => {
        if (items) setReservations(items)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const refreshFloor = useCallback(async () => {
    try {
      const [layoutRes, items] = await Promise.all([
        apiFetch(`/api/restaurants/tables/layout/`),
        fetchReservations(),
      ])
      if (layoutRes.ok) {
        const layoutData = (await layoutRes.json()) as LayoutResponse
        setTables((layoutData.tables ?? []).map(mapTableToFloorTable))
        setLayoutReservations(layoutData.upcoming_reservations ?? [])
      }
      if (items) setReservations(items)
    } catch {
      // keep current state on refresh failure
    }
  }, [])

  const closeOverlay = useCallback(() => {
    setSelectedTableId(null)
    setOverlayDetail(null)
  }, [])

  const onActionComplete = useCallback(async () => {
    await refreshFloor()
    closeOverlay()
  }, [refreshFloor, closeOverlay])

  const { actionBusy, actionError, handleOpenTable, handleActivateReservation, clearActionError } =
    useTableActions({
      selectedTableId,
      onActionComplete,
    })

  const buildOverlayDetail = async (
    tablePublicId: string,
    currentTables: FloorTable[],
    currentReservations: ReservationItem[],
  ) => {
    setOverlayLoading(true)
    setOverlayDetail(null)
    try {
      setOverlayDetail(await fetchOverlayDetail(tablePublicId, currentTables, currentReservations))
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
    clearActionError()
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
