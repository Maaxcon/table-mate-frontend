import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useHallSubscription } from "../../hooks/useHallSubscription"
import {
  TopNav,
  FloorPlan,
  ReservationSidebar,
  TableDetailOverlay,
  OrderCreationModal,
  ModifyReservationModal,
  MoveTableModal,
} from "../../components"
import { NotificationStreamSidebar } from "@/features/notification-stream/components/NotificationStreamSidebar"
import { BookModal } from "@/features/reservation/BookModal"
import { fetchRestaurantSettings } from "@/features/reservation/api"
import type { WorkingHoursDay, Zone } from "@/features/reservation/api"
import { useTableActions } from "../../hooks/useTableActions"
import type { FloorTable, ReservationItem, OverlayDetail, UpcomingReservation } from "../../types"
import { getTableVisualStatus } from "../../types"
import { fetchOverlayDetail, fetchReservations } from "../../api"
import { apiFetch } from "@/api/client"
import type { LayoutResponse, Table } from "@/types/api"
import type { LayoutPayload } from "@/features/editor/types"
import "./WaiterOrderPage.css"

function mapTableToFloorTable(t: Table): FloorTable {
  const item = t as Table & { shape: string; position_x: number | null; position_y: number | null }
  return {
    public_id: item.public_id,
    public_number: item.public_number,
    capacity: item.capacity,
    shape: item.shape,
    is_occupied: item.is_occupied ?? false,
    position_x: item.position_x ?? null,
    position_y: item.position_y ?? null,
    active: item.active ?? true,
    zone: item.zone ?? null,
  }
}

export function WaiterOrderPage() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tables, setTables] = useState<FloorTable[]>([])
  const [layoutPayload, setLayoutPayload] = useState<LayoutPayload | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [layoutReservations, setLayoutReservations] = useState<UpcomingReservation[]>([])
  const [overlayDetail, setOverlayDetail] = useState<OverlayDetail | null>(null)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [sidebarActionLoading, setSidebarActionLoading] = useState(false)
  const [sidebarError, setSidebarError] = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string>("")
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHoursDay> | null>(null)
  const [modifyTarget, setModifyTarget] = useState<ReservationItem | null>(null)
  const [moveTarget, setMoveTarget] = useState<ReservationItem | null>(null)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [createResModalOpen, setCreateResModalOpen] = useState(false)
  const tablesRef = useRef<FloorTable[]>([])
  const reservationsRef = useRef<ReservationItem[]>([])

  useEffect(() => {
    tablesRef.current = tables
  }, [tables])

  useEffect(() => {
    reservationsRef.current = reservations
  }, [reservations])

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
        if (items.length > 0 && !restaurantId) {
          setRestaurantId(String(items[0].restaurant ?? ""))
        }
        setLayoutPayload(
          layoutData.layout && typeof layoutData.layout === "object"
            ? (layoutData.layout as LayoutPayload)
            : null,
        )
        setLayoutReservations(layoutData.upcoming_reservations ?? [])
        if (zonesRes.ok) {
          const zonesData = (await zonesRes.json()) as { results?: Zone[] }
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
    // restaurant is derived inside this effect; rerunning on its change would refetch endlessly
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!restaurantId) return
    fetchRestaurantSettings(restaurantId)
      .then((settings) => setWorkingHours(settings.working_hours))
      .catch(() => setWorkingHours(null))
  }, [restaurantId])

  const refreshFloor = useCallback(async () => {
    try {
      const [layoutRes, items] = await Promise.all([
        apiFetch(`/api/restaurants/tables/layout/`),
        fetchReservations(),
      ])
      let nextTables = tablesRef.current
      let nextReservations = reservationsRef.current
      if (layoutRes.ok) {
        const layoutData = (await layoutRes.json()) as LayoutResponse
        nextTables = (layoutData.tables ?? []).map(mapTableToFloorTable)
        setTables(nextTables)
        setLayoutPayload(
          layoutData.layout && typeof layoutData.layout === "object"
            ? (layoutData.layout as LayoutPayload)
            : null,
        )
        setLayoutReservations(layoutData.upcoming_reservations ?? [])
      }
      if (items) {
        nextReservations = items
        setReservations(items)
      }
      tablesRef.current = nextTables
      reservationsRef.current = nextReservations
      return { tables: nextTables, reservations: nextReservations }
    } catch {
      // keep current state on refresh failure
      return null
    }
  }, [])

  const refreshZones = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/restaurants/zones/`)
      if (res.ok) {
        const data = (await res.json()) as { results?: Zone[] }
        setZones(data.results ?? [])
      }
    } catch {
      // keep current zones on failure
    }
  }, [])

  // A publish may have added/removed a zone, so refresh zones (not just the floor)
  // — otherwise a new zone's tab is missing until a manual page refresh.
  const handleLayoutPublished = useCallback(async () => {
    await Promise.all([refreshFloor(), refreshZones()])
  }, [refreshFloor, refreshZones])

  const closeOverlay = useCallback(() => {
    setSelectedTableId(null)
    setOverlayDetail(null)
  }, [])

  const handleCancel = useCallback(
    async (reservationId: string) => {
      setSidebarActionLoading(true)
      setSidebarError(null)
      try {
        const res = await apiFetch(`/api/reservations/reservations/${reservationId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { detail?: string } | null
          throw new Error(body?.detail ?? "Failed to cancel reservation")
        }
        await refreshFloor()
      } catch (err) {
        setSidebarError(err instanceof Error ? err.message : "Failed to cancel")
      } finally {
        setSidebarActionLoading(false)
      }
    },
    [refreshFloor],
  )

  const onActionComplete = useCallback(async () => {
    await refreshFloor()
    closeOverlay()
  }, [refreshFloor, closeOverlay])

  const {
    actionBusy,
    busyActionId,
    actionError,
    handleOpenTable,
    handleActivateReservation,
    handleCloseCheck,
    clearActionError,
  } = useTableActions({
    selectedTableId,
    onActionComplete,
  })

  const handleModify = useCallback(
    (r: ReservationItem) => {
      const table = tables.find((t) => t.public_number === r.table)
      if (!table) return
      clearActionError()
      setOverlayDetail(null)
      setOverlayLoading(false)
      if (table.zone) setSelectedZoneId(table.zone.public_id)
      setSelectedTableId(table.public_id)
      setModifyTarget(r)
    },
    [tables, clearActionError],
  )

  const { isConnected } = useHallSubscription({
    onLayoutPublished: handleLayoutPublished,
    onTableStatusChanged: refreshFloor,
    onNewReservation: refreshFloor,
    onReservationCancelled: refreshFloor,
    onZoneCreated: refreshZones,
    onZoneUpdated: refreshZones,
    onZoneDeleted: refreshZones,
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

  const filteredTables = useMemo(() => {
    if (!selectedZoneId) return tables
    const layoutTables = layoutPayload?.tables ?? []
    const numbersInZone = new Set(
      layoutTables
        .filter((table) => table.zone_id === selectedZoneId)
        .map((table) => table.public_number),
    )
    if (numbersInZone.size > 0) {
      return tables.filter((table) => numbersInZone.has(table.public_number))
    }
    return tables.filter((table) => table.zone?.public_id === selectedZoneId)
  }, [tables, layoutPayload, selectedZoneId])

  const selectedTable = selectedTableId
    ? (filteredTables.find((t) => t.public_id === selectedTableId) ?? null)
    : null

  const selectedTableReservations = selectedTable
    ? reservations.filter((r) => r.table === selectedTable.public_number)
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

  const visualOccupiedCount = filteredTables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "occupied",
  ).length
  const visualReservedCount = filteredTables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "reserved",
  ).length
  const visualFreeCount = filteredTables.filter(
    (t) => getTableVisualStatus(t, layoutReservations, currentTime) === "free",
  ).length
  const selectedTableVisualStatus = selectedTable
    ? getTableVisualStatus(selectedTable, layoutReservations, currentTime)
    : "free"

  const pendingTodayReservations = reservations.filter(
    (r) =>
      r.status === "pending" && new Date(r.start_at).toDateString() === currentTime.toDateString(),
  )

  const activeReservationsByTable = useMemo(() => {
    const map: Record<string, ReservationItem> = {}
    for (const res of reservations) {
      if (res.status === "active" && res.table) {
        map[res.table] = res
      }
    }
    return map
  }, [reservations])

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
        isConnected={isConnected}
        zones={zones}
        selectedZoneId={selectedZoneId}
        onZoneChange={(zoneId) => setSelectedZoneId(zoneId)}
      />

      <div className="waiter-view__content">
        <div className="waiter-view__floor-card">
          <FloorPlan
            payload={layoutPayload}
            tables={tables}
            selectedZoneId={selectedZoneId}
            selectedId={selectedTableId}
            upcomingReservations={layoutReservations}
            currentTime={currentTime}
            activeReservationsByTable={activeReservationsByTable}
            onSelect={handleTableSelect}
            onZoneChange={setSelectedZoneId}
            canvasCols={zones.find((z) => z.public_id === selectedZoneId)?.canvas_cols}
            canvasRows={zones.find((z) => z.public_id === selectedZoneId)?.canvas_rows}
            edgeStyles={zones.find((z) => z.public_id === selectedZoneId)?.edge_styles}
          />
        </div>

        <div className="waiter-view__side-grid">
          <ReservationSidebar
            reservations={pendingTodayReservations}
            onCancel={handleCancel}
            onModify={handleModify}
            actionLoading={sidebarActionLoading}
            error={sidebarError}
          />

          <NotificationStreamSidebar />
        </div>
      </div>

      {selectedTable && (
        <TableDetailOverlay
          key={selectedTableId}
          table={selectedTable}
          detail={overlayDetail}
          tableReservations={selectedTableReservations}
          visualStatus={selectedTableVisualStatus}
          loading={overlayLoading}
          currentTime={currentTime}
          actionBusy={actionBusy}
          busyActionId={busyActionId}
          actionError={actionError}
          onOpenTable={handleOpenTable}
          onActivateReservation={handleActivateReservation}
          onCancelReservation={(reservationId) => handleCancel(reservationId)}
          onCloseCheck={overlayDetail ? () => handleCloseCheck(overlayDetail.public_id) : undefined}
          onAddItem={overlayDetail ? () => setOrderModalOpen(true) : undefined}
          onModifyReservation={(r) => setModifyTarget(r)}
          onMoveTable={(r) => setMoveTarget(r)}
          onCreateReservation={() => setCreateResModalOpen(true)}
          onClose={closeOverlay}
        />
      )}

      {modifyTarget && (
        <ModifyReservationModal
          reservation={modifyTarget}
          tables={tables.map((t) => ({ public_id: t.public_id, public_number: t.public_number }))}
          onClose={() => setModifyTarget(null)}
          onSuccess={() => {
            setModifyTarget(null)
            refreshFloor()
          }}
        />
      )}

      {orderModalOpen && overlayDetail && (
        <OrderCreationModal
          sessionId={overlayDetail.public_id}
          guestCount={overlayDetail.guest_count}
          restaurantId={restaurantId}
          onClose={() => setOrderModalOpen(false)}
          onSuccess={async () => {
            setOrderModalOpen(false)
            const latest = await refreshFloor()
            if (selectedTableId && latest) {
              await buildOverlayDetail(selectedTableId, latest.tables, latest.reservations)
            }
          }}
        />
      )}

      {createResModalOpen && selectedTable && (
        <BookModal
          table={selectedTable}
          workingHours={workingHours}
          restaurantId={restaurantId}
          showNameField
          onClose={() => setCreateResModalOpen(false)}
          onSuccess={(r) => {
            if (r) {
              const mapped: ReservationItem = {
                public_id: r.public_id,
                start_at: r.start_at,
                end_at: r.end_at,
                table: r.table_info?.public_number ?? "",
                guest_count: r.guest_count,
                status: r.status as ReservationItem["status"],
                notes: r.notes,
                name: r.customer_name ?? "Guest",
              }
              setReservations((prev) => [...prev, mapped])
            }
            setCreateResModalOpen(false)
            refreshFloor()
          }}
        />
      )}

      {moveTarget && (
        <MoveTableModal
          reservation={moveTarget}
          tables={tables
            .filter((t) => getTableVisualStatus(t, layoutReservations, currentTime) === "free")
            .map((t) => ({ public_id: t.public_id, public_number: t.public_number }))}
          onClose={() => setMoveTarget(null)}
          onSuccess={() => {
            setMoveTarget(null)
            refreshFloor()
          }}
        />
      )}
    </div>
  )
}
