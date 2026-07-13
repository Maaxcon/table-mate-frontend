import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import type { UserRole } from "@/features/auth/types"
import RedirectToLogin from "@/routes/RedirectToLogin"

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = useAppSelector((state) => state.auth.user)

  if (!user) return <RedirectToLogin />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

export default ProtectedRoute
