import { Navigate, useLocation } from "react-router-dom"
import { setPostLoginRedirect } from "@/store/auth/postLoginRedirect"

/**
 * Bounces an unauthenticated visitor to "/", remembering where they were
 * headed so a successful login can return them there instead of a
 * role-default page. Shared by every guard that rejects unauthenticated
 * users (ProtectedRoute, AdminRoute).
 */
function RedirectToLogin() {
  const location = useLocation()
  setPostLoginRedirect(location.pathname + location.search)
  return <Navigate to="/" replace />
}

export default RedirectToLogin
