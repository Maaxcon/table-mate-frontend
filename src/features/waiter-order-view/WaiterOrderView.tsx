import { useState } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { ReservationsView } from "./components/ReservationsView"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import { FLOOR_TABLES, RESERVATIONS, OVERLAY_DETAILS, type FloorTable } from "./data/mockData"
import "@/assets/colors.css"
import "./WaiterOrderView.css"

export function WaiterOrderView() {
  const [activeTab, setActiveTab] = useState("FLOOR PLAN")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const selectedTable = selectedTableId
    ? (FLOOR_TABLES.find((t) => t.public_id === selectedTableId) ?? null)
    : null
  const selectedDetail = selectedTableId ? (OVERLAY_DETAILS[selectedTableId] ?? null) : null
  const selectedTableReservations = selectedTable
    ? RESERVATIONS.filter((r) => r.table === `T-${selectedTable.table_number}`)
    : []

  const handleTableSelect = (table: FloorTable) => {
    setSelectedTableId(table.public_id)
  }

  const showFloorPlan = activeTab === "FLOOR PLAN"
  const showReservations = activeTab === "RESERVATIONS"

  return (
    <div className="waiter-view">
      <TopNav tables={FLOOR_TABLES} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="waiter-view__layout">
        <div className="waiter-view__main">
          {showFloorPlan && (
            <FloorPlan
              tables={FLOOR_TABLES}
              selectedId={selectedTableId}
              onSelect={handleTableSelect}
            />
          )}
          {showReservations && <ReservationsView reservations={RESERVATIONS} />}
          {!showFloorPlan && !showReservations && (
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
