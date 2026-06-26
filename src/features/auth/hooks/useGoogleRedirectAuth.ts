import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { useGoogleLogin } from "@react-oauth/google"
import { useEffect, useState } from "react"
import {
  googleAuthCleanupQueryParams,
  googleAuthMessage,
  googleAuthStateStorageKey,
} from "./googleAuth.constants"
import type { GoogleFeedbackType, InitialGoogleFeedback, MeResponse } from "@/features/auth/types"
import type { GoogleAuthResponse } from "@/types/api/types.gen"
import { useAppDispatch } from "@/store/hooks"
import { clearAuth, setAccessToken, setUser } from "@/store/auth/authSlice"
import { apiFetch } from "@/api/client"

type UseGoogleRedirectAuthResult = {
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
  handleGoogleLogin: () => void
  loading: boolean
}

function readAndClearStoredState(): string | null {
  try {
    const stored = window.sessionStorage.getItem(googleAuthStateStorageKey)
    window.sessionStorage.removeItem(googleAuthStateStorageKey)
    return stored
  } catch {
    return null
  }
}

function getInitialGoogleFeedback(): InitialGoogleFeedback {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (code) {
    const returnedState = url.searchParams.get("state")
    const storedState = readAndClearStoredState()

    for (const param of googleAuthCleanupQueryParams) {
      url.searchParams.delete(param)
    }

    if (!storedState || returnedState !== storedState) {
      return {
        code: null,
        message: googleAuthMessage.redirectFailed,
        type: "error",
        cleanUrl: url.toString(),
      }
    }

    return {
      code,
      message: googleAuthMessage.signingIn,
      type: "success",
      cleanUrl: url.toString(),
    }
  }

  if (error) {
    url.searchParams.delete("error")

    return {
      code: null,
      message: googleAuthMessage.redirectFailed,
      type: "error",
      cleanUrl: url.toString(),
    }
  }

  return { code: null, message: "", type: "success", cleanUrl: null }
}

function useGoogleRedirectAuth(): UseGoogleRedirectAuthResult {
  const dispatch = useAppDispatch()
  const [initialGoogleFeedback] = useState<InitialGoogleFeedback>(() => getInitialGoogleFeedback())
  const [googleFeedback, setGoogleFeedback] = useState<string>(initialGoogleFeedback.message)
  const [googleFeedbackType, setGoogleFeedbackType] = useState<GoogleFeedbackType>(
    initialGoogleFeedback.type,
  )
  const [loading, setLoading] = useState<boolean>(() => Boolean(initialGoogleFeedback.code))

  useEffect(() => {
    if (!initialGoogleFeedback.code) {
      return
    }

    const controller = new AbortController()

    const exchangeGoogleCode = async (code: string) => {
      if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
        setGoogleFeedback(googleAuthMessage.unavailable)
        setGoogleFeedbackType("error")
        setLoading(false)
        return
      }

      setGoogleFeedback(googleAuthMessage.signingIn)
      setGoogleFeedbackType("success")

      let tokenApplied = false

      try {
        const response = await fetch(`${env.apiBaseUrl}/api/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code, redirect_uri: window.location.origin }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as GoogleAuthResponse & {
          detail?: string
          message?: string
        }

        if (!response.ok) {
          throw new Error(payload.detail ?? payload.message ?? googleAuthMessage.backendAuthFailed)
        }

        if (!payload.access) {
          throw new Error(googleAuthMessage.backendAuthFailed)
        }

        dispatch(setAccessToken(payload.access))
        tokenApplied = true

        const meResponse = await apiFetch("/api/auth/me/", { signal: controller.signal })
        if (!meResponse.ok) {
          throw new Error(googleAuthMessage.backendAuthFailed)
        }
        const me = (await meResponse.json()) as MeResponse

        dispatch(
          setUser({
            email: me.email,
            firstName: me.first_name,
            lastName: me.last_name,
            role: me.role,
            restaurantId: me.restaurant_public_id,
          }),
        )

        setGoogleFeedback(googleAuthMessage.backendAuthSuccess)
        setGoogleFeedbackType("success")
        setLoading(false)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        if (tokenApplied) {
          dispatch(clearAuth())
        }
        setGoogleFeedback(googleAuthMessage.backendAuthFailed)
        setGoogleFeedbackType("error")
        setLoading(false)
      }
    }

    void exchangeGoogleCode(initialGoogleFeedback.code)
    return () => controller.abort()
  }, [initialGoogleFeedback.code, dispatch])

  useEffect(() => {
    if (initialGoogleFeedback.cleanUrl) {
      window.history.replaceState({}, document.title, initialGoogleFeedback.cleanUrl)
    }
  }, [initialGoogleFeedback.cleanUrl])

  const [oauthState] = useState<string>(() => crypto.randomUUID())

  const runGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: window.location.origin,
    state: oauthState,
  })

  const handleGoogleLogin = () => {
    if (env.googleClientId === ENV_NOT_CONFIGURED_VALUE) {
      setGoogleFeedback(googleAuthMessage.unavailable)
      setGoogleFeedbackType("error")
      return
    }

    try {
      window.sessionStorage.setItem(googleAuthStateStorageKey, oauthState)
    } catch {
      setGoogleFeedback(googleAuthMessage.unavailable)
      setGoogleFeedbackType("error")
      return
    }

    setGoogleFeedbackType("success")
    setGoogleFeedback(googleAuthMessage.redirecting)
    setLoading(true)
    runGoogleLogin()
  }

  return { googleFeedback, googleFeedbackType, handleGoogleLogin, loading }
}

export { useGoogleRedirectAuth }
export type { UseGoogleRedirectAuthResult }
