import { type PropsWithChildren, useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/api/client"
import { setUser } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import type { MeResponse } from "@/features/auth/types"

function AuthInitializer({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch()
  // If an OAuth code/error is present, useGoogleRedirectAuth handles auth —
  // skip the session-restore check so we don't spam spurious 401s.
  const isOAuthFlow = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.has("code") || params.has("error")
  }, [])
  const [ready, setReady] = useState(isOAuthFlow)

  useEffect(() => {
    if (isOAuthFlow) return

    const controller = new AbortController()

    apiFetch("/api/auth/me/", { signal: controller.signal })
      .then(async (res) => {
        if (res.ok) {
          const me = (await res.json()) as MeResponse
          dispatch(
            setUser({
              email: me.email,
              firstName: me.first_name,
              lastName: me.last_name,
              role: me.role,
              restaurantId: me.restaurant_public_id,
            }),
          )
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true)
      })

    return () => controller.abort()
  }, [dispatch, isOAuthFlow])

  if (!ready) return null

  return <>{children}</>
}

export default AuthInitializer
