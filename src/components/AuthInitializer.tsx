import { type PropsWithChildren, useEffect, useMemo, useState } from "react"
import { apiFetch, ensureSession } from "@/api/client"
import { setUser } from "@/store/auth/authSlice"
import { hasHadSession } from "@/store/auth/sessionFlag"
import { useAppDispatch } from "@/store/hooks"
import type { MeResponse } from "@/features/auth/types"

function AuthInitializer({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch()
  // Restore a session only when it makes sense: skip the OAuth flow (handled by
  // useGoogleRedirectAuth) and skip guests who never logged in on this device
  // (avoids a spurious 401 from the refresh probe).
  const shouldRestore = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const isOAuthFlow = params.has("code") || params.has("error")
    return !isOAuthFlow && hasHadSession()
  }, [])
  const [ready, setReady] = useState(!shouldRestore)

  useEffect(() => {
    if (!shouldRestore) return

    const controller = new AbortController()
    const { signal } = controller

    async function restoreSession() {
      try {
        // Refresh first to avoid the 401 → retry cycle that apiFetch would produce.
        const access = await ensureSession()
        if (!access || signal.aborted) return

        const meRes = await apiFetch("/api/auth/me/", { signal })
        if (!meRes.ok) return

        const me = (await meRes.json()) as MeResponse
        dispatch(
          setUser({
            public_id: me.public_id,
            email: me.email,
            firstName: me.first_name,
            lastName: me.last_name,
            role: me.role,
            restaurantId: me.restaurant_public_id,
          }),
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        console.debug("Failed to restore auth session", err)
      } finally {
        if (!signal.aborted) setReady(true)
      }
    }

    void restoreSession()
    return () => controller.abort()
  }, [dispatch, shouldRestore])

  if (!ready) return null

  return <>{children}</>
}

export default AuthInitializer
