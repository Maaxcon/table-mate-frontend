import { Link } from "react-router-dom"
import { NotificationStreamSidebar } from "@/features/notification-stream/components/NotificationStreamSidebar"
import "./StaffOrdersPage.css"

function StaffOrdersPage() {
  return (
    <div className="staff-orders">
      <nav className="staff-orders__nav">
        <span className="staff-orders__brand">KITCHEN ORDERS</span>
        <Link to="/waiter-order" className="staff-orders__link">
          FLOOR
        </Link>
      </nav>

      <div className="staff-orders__body">
        <div className="staff-orders__content">
          <p className="staff-orders__placeholder">Kitchen order queue — coming soon.</p>
        </div>
        <NotificationStreamSidebar />
      </div>
    </div>
  )
}

export default StaffOrdersPage
