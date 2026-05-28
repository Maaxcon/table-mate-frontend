import { useState } from "react"
import { TopNav } from "./components/TopNav"
import { FloorPlan } from "./components/FloorPlan"
import { ReservationSidebar } from "./components/ReservationSidebar"
import { TableDetailOverlay } from "./components/TableDetailOverlay"
import { FLOOR_TABLES, RESERVATIONS, OVERLAY_DETAILS, type FloorTable } from "./data/mockData"
import "@/assets/colors.css"
import "./WaiterOrderView.css"

export function WaiterOrderView() {
  const [activeTab, setActiveTab] = useState("FLOOR PLAN")
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const selectedDetail = selectedTableId ? OVERLAY_DETAILS[selectedTableId] : null

  const handleTableSelect = (table: FloorTable) => {
    if (table.status === "occupied") {
      setSelectedTableId(table.public_id)
    }
  }

  const showFloorPlan = activeTab === "FLOOR PLAN"

  return (
    <div className="waiter-view">
      <TopNav tables={FLOOR_TABLES} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="waiter-view__layout">
        <div className="waiter-view__main">
          {showFloorPlan ? (
            <FloorPlan
              tables={FLOOR_TABLES}
              selectedId={selectedTableId}
              onSelect={handleTableSelect}
            />
          ) : (
            <div className="waiter-view__placeholder">
              <p>{activeTab} view — not yet implemented</p>
            </div>
          )}
        </div>

        <ReservationSidebar reservations={RESERVATIONS} />
      </div>

      {selectedDetail && (
        <TableDetailOverlay detail={selectedDetail} onClose={() => setSelectedTableId(null)} />
      )}
    </div>
  )
}
