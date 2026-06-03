import { useEffect, useState } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import type { FloorTable } from "./data/mockData"
import { RESERVATIONS, OVERLAY_DETAILS } from "./data/mockData"
import { apiFetch } from "@/api/client"
import "./WaiterOrderView.css"

interface TableApiResponse {
  public_id: string
  table_number: string
  capacity: number
  shape: string
  status: string
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

interface WaiterOrderViewProps {
  restaurantId: string
}

export function WaiterOrderView({ restaurantId }: WaiterOrderViewProps) {
  const [activeTab, setActiveTab] = useState("FLOOR PLAN")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tables, setTables] = useState<FloorTable[]>([])
  const [zones, setZones] = useState<ZoneApiResponse[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      apiFetch(`/api/restaurants/tables/?restaurant=${restaurantId}`, {
        signal: controller.signal,
      }),
      apiFetch(`/api/restaurants/zones/?restaurant=${restaurantId}`, { signal: controller.signal }),
    ])
      .then(async ([tablesRes, zonesRes]) => {
        if (!tablesRes.ok) throw new Error("Failed to load tables")
        const tablesData = (await tablesRes.json()) as { results?: TableApiResponse[] }
        const items = tablesData.results ?? []
        setTables(
          items.map((t) => ({
            public_id: t.public_id,
            table_number: t.table_number,
            capacity: t.capacity,
            shape: t.shape as FloorTable["shape"],
            status: t.status as FloorTable["status"],
            position_x: t.position_x,
            position_y: t.position_y,
            active: t.active,
            zone: t.zone ?? null,
          })),
        )
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
  }, [restaurantId])

  const filteredTables = selectedZoneId
    ? tables.filter((t) => t.zone?.public_id === selectedZoneId)
    : tables

  const selectedTable = selectedTableId
    ? (filteredTables.find((t) => t.public_id === selectedTableId) ?? null)
    : null
  const selectedDetail = selectedTableId ? (OVERLAY_DETAILS[selectedTableId] ?? null) : null
  const selectedTableReservations = selectedTable
    ? RESERVATIONS.filter((r) => {
        const tableLabel = r.table.replace("T-", "")
        return tableLabel === selectedTable.table_number
      })
    : []

  const handleTableSelect = (table: FloorTable) => {
    setSelectedTableId(table.public_id)
  }

  const showFloorPlan = activeTab === "FLOOR PLAN"

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
      <TopNav tables={tables} activeTab={activeTab} onTabChange={setActiveTab} />

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
              onSelect={handleTableSelect}
            />
          ) : (
            <div className="waiter-view__placeholder">
              <p>{activeTab} view — not yet implemented</p>
            </div>
          )}
        </div>

        {showFloorPlan && <ReservationSidebar reservations={RESERVATIONS} />}
      </div>

      {selectedTable && (
        <TableDetailOverlay
          table={selectedTable}
          detail={selectedDetail}
          tableReservations={selectedTableReservations}
          onClose={() => setSelectedTableId(null)}
        />
      )}
    </div>
  )
}
