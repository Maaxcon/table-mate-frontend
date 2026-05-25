import { type PropsWithChildren, useEffect, useState } from "react"
import { apiFetch } from "@/api/client"
import { setUser } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import type { MeResponse } from "@/types/auth"

function AuthInitializer({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch()
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
  }, [dispatch])

  if (!ready) return null

  return <>{children}</>
}

export default AuthInitializer
