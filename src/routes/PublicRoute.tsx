import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAppSelector } from "@/store/hooks"
import { clearPostLoginRedirect, peekPostLoginRedirect } from "@/store/auth/postLoginRedirect"

function PublicRoute() {
  const user = useAppSelector((state) => state.auth.user)

  // Read-only during render (safe under StrictMode's double-render); the
  // matching clear runs once the redirect has actually been committed.
  // Staleness (abandoned login, much later unrelated login) is handled by
  // postLoginRedirect's own expiry, not by unmount timing — a cleanup-based
  // clear would fire during StrictMode's dev-only mount/cleanup/mount
  // rehearsal and wipe the flag before it's ever used.
  useEffect(() => {
    if (user) clearPostLoginRedirect()
  }, [user])

  if (user) {
    const redirectTarget = peekPostLoginRedirect()
    if (redirectTarget) {
      return <Navigate to={redirectTarget} replace />
    }
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
