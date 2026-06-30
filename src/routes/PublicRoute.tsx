import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

function PublicRoute() {
  const user = useAppSelector((state) => state.auth.user)
  if (user) {
    if (user.role === "cook") {
      return <Navigate to="/staff/orders" replace />
    }
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />
    }
    if (user.role === "waiter") {
      return <Navigate to="/waiter-order" replace />
    }
    return <Navigate to="/restaurants" replace />
  }
  return <Outlet />
}

export default PublicRoute
