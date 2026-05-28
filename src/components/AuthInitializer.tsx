import { type PropsWithChildren, useEffect, useMemo, useState } from "react"
import { env } from "@/config/env"
import { setAccessToken, setUser } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import type { MeResponse } from "@/features/auth/types"

function AuthInitializer({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch()
  // If an OAuth code/error is present, useGoogleRedirectAuth handles auth —
  // skip the session-restore check to avoid spurious 401s.
  const isOAuthFlow = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.has("code") || params.has("error")
  }, [])
  const [ready, setReady] = useState(isOAuthFlow)

  useEffect(() => {
    if (isOAuthFlow) return

    const controller = new AbortController()
    const { signal } = controller

    async function restoreSession() {
      try {
        // 1. Refresh first — get a fresh access token from the httpOnly cookie.
        //    This avoids the 401 → retry cycle that apiFetch would produce.
        const refreshRes = await fetch(`${env.apiBaseUrl}/api/auth/refresh/`, {
          method: "POST",
          credentials: "include",
          signal,
        })
        if (!refreshRes.ok) return // no active session, stay logged out silently

        const { access } = (await refreshRes.json()) as { access?: string }
        if (!access) return

        dispatch(setAccessToken(access))

        // 2. Load user data with the fresh token — no 401 risk.
        const meRes = await fetch(`${env.apiBaseUrl}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${access}` },
          credentials: "include",
          signal,
        })
        if (!meRes.ok) return

        const me = (await meRes.json()) as MeResponse
        dispatch(
          setUser({
            email: me.email,
            firstName: me.first_name,
            lastName: me.last_name,
            role: me.role,
            restaurantId: me.restaurant_public_id,
          }),
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
      } finally {
        if (!signal.aborted) setReady(true)
      }
    }

    void restoreSession()
    return () => controller.abort()
  }, [dispatch, isOAuthFlow])

  if (!ready) return null

  return <>{children}</>
}

export default AuthInitializer
