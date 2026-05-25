import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

function ProtectedRoute() {
  const user = useAppSelector((state) => state.auth.user)
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}

export default ProtectedRoute
