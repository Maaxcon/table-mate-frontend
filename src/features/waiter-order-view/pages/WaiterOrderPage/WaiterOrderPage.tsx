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
import { useNotificationStream } from "@/features/notification-stream/hooks/useNotificationStream"
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
import { useWaiterStrings } from "../../strings"

const CLOCK_TICK_MS = 10_000
const FLOOR_REFRESH_POLL_MS = 30_000
const OVERDUE_UI_CAP_MINUTES = 999

function getOverdueMinutes(endAt: string, nowMs: number): number | null {
  const endMs = new Date(endAt).getTime()
  if (!Number.isFinite(endMs)) return null
  const diffMs = nowMs - endMs
  if (diffMs <= 0) return null
  return Math.max(1, Math.floor(diffMs / 60_000))
}

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
  const waiterStrings = useWaiterStrings()
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
  const [sidebarTab, setSidebarTab] = useState<"reservations" | "notifications">("reservations")
  const TABLET_BREAKPOINT = 1180
  const [isTabletLayout, setIsTabletLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= TABLET_BREAKPOINT : false,
  )
  const {
    events: notificationEvents,
    isConnected: notificationConnected,
    unreadCount: notificationUnreadCount,
    markEventRead,
    markAllRead,
  } = useNotificationStream()
  const tablesRef = useRef<FloorTable[]>([])
  const reservationsRef = useRef<ReservationItem[]>([])
  const showNotificationReminder =
    isTabletLayout && sidebarTab !== "notifications" && notificationUnreadCount > 0

  useEffect(() => {
    const update = () => setIsTabletLayout(window.innerWidth <= TABLET_BREAKPOINT)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    tablesRef.current = tables
  }, [tables])

  useEffect(() => {
    reservationsRef.current = reservations
  }, [reservations])

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), CLOCK_TICK_MS)
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
        setError(err instanceof Error ? err.message : waiterStrings.page.loadError)
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
      tablesRef.current = nextTables
      if (items) {
        setReservations(items)
        reservationsRef.current = items
      }
      return { tables: nextTables, reservations: reservationsRef.current }
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

  useEffect(() => {
    const id = setInterval(() => {
      void refreshFloor()
    }, FLOOR_REFRESH_POLL_MS)
    return () => clearInterval(id)
  }, [refreshFloor])

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
        setSidebarError(err instanceof Error ? err.message : waiterStrings.page.cancelError)
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
    errorMessages: waiterStrings.actions,
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

  const mergedReservations = useMemo(() => {
    const occupiedTableNumbers = new Set(
      tables.filter((t) => t.is_occupied).map((t) => t.public_number),
    )
    const byId = new Map(reservations.map((r) => [r.public_id, r]))
    const merged = [...reservations]
    for (const lr of layoutReservations) {
      if (byId.has(lr.public_id)) continue
      const table = tables.find((t) => t.public_id === lr.table_id)
      merged.push({
        public_id: lr.public_id,
        start_at: lr.start_at,
        end_at: lr.end_at ?? lr.start_at,
        table: table?.public_number ?? "",
        guest_count: lr.guest_count ?? 2,
        status: "pending" as const,
        notes: null,
        name: lr.customer_name ?? "Guest",
      })
    }
    return merged.filter((r) => !(r.status === "active" && !occupiedTableNumbers.has(r.table)))
  }, [reservations, layoutReservations, tables])

  const selectedTableReservations = selectedTable
    ? mergedReservations.filter((r) => r.table === selectedTable.public_number)
    : []

  const overdueByTableId = useMemo(() => {
    const tableByNumber = new Map(tables.map((table) => [table.public_number, table]))
    const nowMs = currentTime.getTime()
    const result: Record<string, number> = {}
    for (const reservation of mergedReservations) {
      if (reservation.status !== "active") continue
      if (!reservation.table) continue
      const table = tableByNumber.get(reservation.table)
      if (!table || !table.is_occupied) continue
      const minutes = getOverdueMinutes(reservation.end_at, nowMs)
      if (minutes == null) continue
      result[table.public_id] = Math.min(minutes, OVERDUE_UI_CAP_MINUTES)
    }
    return result
  }, [tables, mergedReservations, currentTime])

  const handleTableSelect = (table: FloorTable) => {
    clearActionError()
    setSelectedTableId(table.public_id)
    if (table.is_occupied) {
      buildOverlayDetail(table.public_id, tables, mergedReservations)
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

  const pendingTodayReservations = mergedReservations.filter(
    (r) =>
      r.status === "pending" && new Date(r.start_at).toDateString() === currentTime.toDateString(),
  )

  const activeReservationsByTable = useMemo(() => {
    const map: Record<string, ReservationItem> = {}
    for (const res of mergedReservations) {
      if (res.status === "active" && res.table) {
        map[res.table] = res
      }
    }
    return map
  }, [mergedReservations])

  if (loading)
    return (
      <div className="waiter-view">
        <p className="waiter-view__message">{waiterStrings.page.loading}</p>
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
            key={selectedZoneId ?? "all-zones"}
            payload={layoutPayload}
            tables={tables}
            selectedZoneId={selectedZoneId}
            selectedId={selectedTableId}
            upcomingReservations={layoutReservations}
            currentTime={currentTime}
            activeReservationsByTable={activeReservationsByTable}
            overdueByTableId={overdueByTableId}
            onSelect={handleTableSelect}
            onZoneChange={setSelectedZoneId}
            canvasCols={zones.find((z) => z.public_id === selectedZoneId)?.canvas_cols}
            canvasRows={zones.find((z) => z.public_id === selectedZoneId)?.canvas_rows}
            edgeStyles={zones.find((z) => z.public_id === selectedZoneId)?.edge_styles}
            enableZoom={true}
            enablePan={true}
          />
        </div>

        {isTabletLayout ? (
          <div className="waiter-view__sidebar" role="complementary">
            <div className="waiter-view__sidebar-tabs">
              <button
                type="button"
                aria-pressed={sidebarTab === "reservations"}
                className={`waiter-view__sidebar-tab${sidebarTab === "reservations" ? " waiter-view__sidebar-tab--active" : ""}`}
                onClick={() => setSidebarTab("reservations")}
              >
                {waiterStrings.page.tabs.reservations}
              </button>
              <button
                type="button"
                aria-pressed={sidebarTab === "notifications"}
                className={`waiter-view__sidebar-tab${sidebarTab === "notifications" ? " waiter-view__sidebar-tab--active" : ""}`}
                onClick={() => setSidebarTab("notifications")}
                title={
                  showNotificationReminder
                    ? waiterStrings.page.notifications.unread(notificationUnreadCount)
                    : undefined
                }
              >
                {waiterStrings.page.tabs.notifications}
                {showNotificationReminder && (
                  <span
                    className="waiter-view__sidebar-tab-badge"
                    aria-label={waiterStrings.page.notifications.unread(notificationUnreadCount)}
                  >
                    {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="waiter-view__sidebar-panel">
              {sidebarTab === "reservations" ? (
                <ReservationSidebar
                  reservations={pendingTodayReservations}
                  onCancel={handleCancel}
                  onModify={handleModify}
                  actionLoading={sidebarActionLoading}
                  error={sidebarError}
                />
              ) : (
                <NotificationStreamSidebar
                  events={notificationEvents}
                  isConnected={notificationConnected}
                  markEventRead={markEventRead}
                  markAllRead={markAllRead}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="waiter-view__side-grid">
            <ReservationSidebar
              reservations={pendingTodayReservations}
              onCancel={handleCancel}
              onModify={handleModify}
              actionLoading={sidebarActionLoading}
              error={sidebarError}
            />

            <NotificationStreamSidebar
              events={notificationEvents}
              isConnected={notificationConnected}
              markEventRead={markEventRead}
              markAllRead={markAllRead}
            />
          </div>
        )}
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
          onSuccess={() => {
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
