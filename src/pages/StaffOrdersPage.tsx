import { NotificationStreamSidebar } from "@/features/notification-stream/components/NotificationStreamSidebar"
import { KitchenKanban } from "@/features/kitchen-kanban/KitchenKanban"
import "./StaffOrdersPage.css"

function StaffOrdersPage() {
  return (
    <div className="staff-orders">
      <div className="staff-orders__body">
        <KitchenKanban />
        <NotificationStreamSidebar />
      </div>
    </div>
  )
}

export default StaffOrdersPage
