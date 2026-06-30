import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiFetch } from "@/api/client"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"

type UseLogoutResult = {
  logout: () => Promise<void>
  loggingOut: boolean
  logoutFailed: boolean
}

// Clears local auth state only after the server confirms logout. A network or
// server error may leave the httpOnly refresh cookie alive, so on failure we
// keep the local session and let the user retry instead of looking signed out
// while the cookie survives.
export function useLogout(): UseLogoutResult {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)

  const logout = async () => {
    setLoggingOut(true)
    setLogoutFailed(false)
    try {
      const response = await apiFetch("/api/auth/logout/", { method: "POST" })
      // 401/403 means the server session is already gone, so the cookie is
      // already invalid and clearing locally is safe.
      if (!response.ok && response.status !== 401 && response.status !== 403) {
        setLogoutFailed(true)
        return
      }
    } catch {
      setLogoutFailed(true)
      return
    } finally {
      setLoggingOut(false)
    }

    dispatch(clearAuth())
    navigate("/", { replace: true })
  }

  return { logout, loggingOut, logoutFailed }
}
