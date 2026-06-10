import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

const STAFF_ROLES = new Set(["admin", "waiter", "cook"])

function PublicRoute() {
  const user = useAppSelector((state) => state.auth.user)
  if (user) {
    if (STAFF_ROLES.has(user.role)) {
      return <Navigate to="/waiter-order" replace />
    }
    return <Navigate to="/restaurants" replace />
  }
  return <Outlet />
}

export default PublicRoute
