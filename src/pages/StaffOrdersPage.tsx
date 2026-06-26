import { useState } from "react"
import { NotificationStreamSidebar } from "@/features/notification-stream/components/NotificationStreamSidebar"
import { KitchenKanban } from "@/features/kitchen-kanban/KitchenKanban"
import "./StaffOrdersPage.css"

function StaffOrdersPage() {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className="staff-orders">
      <div className="staff-orders__body">
        <KitchenKanban isConnected={isConnected} />
        <NotificationStreamSidebar onConnectionChange={setIsConnected} />
      </div>
    </div>
  )
}

export default StaffOrdersPage
