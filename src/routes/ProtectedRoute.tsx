import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import type { UserRole } from "@/features/auth/types"
import { setPostLoginRedirect } from "@/store/auth/postLoginRedirect"

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()

  if (!user) {
    setPostLoginRedirect(location.pathname + location.search)
    return <Navigate to="/" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

export default ProtectedRoute
