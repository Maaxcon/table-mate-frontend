import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import { setPostLoginRedirect } from "@/store/auth/postLoginRedirect"

/**
 * Guards the /admin area: only authenticated users with the admin role may enter.
 * Mirrors ProtectedRoute, but also rejects non-admin staff and customers.
 */
function AdminRoute() {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()

  if (!user) {
    setPostLoginRedirect(location.pathname + location.search)
    return <Navigate to="/" replace />
  }
  if (user.role !== "admin") return <Navigate to="/cabinet" replace />

  return <Outlet />
}

export default AdminRoute
