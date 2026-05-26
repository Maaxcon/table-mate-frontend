import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"

function StaffContextRoute() {
  const staffContextPending = useAppSelector((state) => state.auth.staffContextPending)
  if (!staffContextPending) return <Navigate to="/" replace />
  return <Outlet />
}

export default StaffContextRoute
