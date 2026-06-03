import { useEffect, useState } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import type { FloorTable } from "./data/mockData"
import { RESERVATIONS, OVERLAY_DETAILS } from "./data/mockData"
import { apiFetch } from "@/api/client"
import "@/assets/colors.css"
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
}

interface WaiterOrderViewProps {
  restaurantId: string
}

export function WaiterOrderView({ restaurantId }: WaiterOrderViewProps) {
  const [activeTab, setActiveTab] = useState("FLOOR PLAN")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [tables, setTables] = useState<FloorTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch(`/api/restaurants/tables/?restaurant=${restaurantId}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load tables")
        const data = (await res.json()) as { results?: TableApiResponse[] }
        const items = data.results ?? []
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
          })),
        )
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Failed to load tables")
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [restaurantId])

  const selectedTable = selectedTableId
    ? (tables.find((t) => t.public_id === selectedTableId) ?? null)
    : null
  const selectedDetail = selectedTableId ? (OVERLAY_DETAILS[selectedTableId] ?? null) : null
  const selectedTableReservations = selectedTable
    ? RESERVATIONS.filter((r) => r.table === `T-${selectedTable.table_number}`)
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

      <div className="waiter-view__layout">
        <div className="waiter-view__main">
          {showFloorPlan ? (
            <FloorPlan tables={tables} selectedId={selectedTableId} onSelect={handleTableSelect} />
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
