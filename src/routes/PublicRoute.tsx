import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

function PublicRoute() {
  const user = useAppSelector((state) => state.auth.user)
  if (user) return <Navigate to="/home" replace />
  return <Outlet />
}

export default PublicRoute
