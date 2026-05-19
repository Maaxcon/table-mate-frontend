import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { useGoogleLogin } from "@react-oauth/google"
import { useEffect, useState } from "react"
import { googleAuthCleanupQueryParams, googleAuthMessage } from "./googleAuth.constants"
import type { GoogleFeedbackType, InitialGoogleFeedback } from "@/types/auth/googleAuth"
import { useAppDispatch } from "@/store/hooks"
import { setAccessToken } from "@/store/auth/authSlice"

type UseGoogleRedirectAuthResult = {
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
  handleGoogleLogin: () => void
}

type BackendGoogleAuthResponse = {
  access?: string
  detail?: string
  message?: string
}

function getInitialGoogleFeedback(): InitialGoogleFeedback {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (code) {
    for (const param of googleAuthCleanupQueryParams) {
      url.searchParams.delete(param)
    }

    return {
      code,
      message: googleAuthMessage.successFromRedirect,
      type: "success",
      cleanUrl: url.toString(),
    }
  }

  if (error) {
    url.searchParams.delete("error")

    return {
      code: null,
      message: `Google sign-in failed: ${error}.`,
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

  useEffect(() => {
    if (!initialGoogleFeedback.code) {
      return
    }

    const controller = new AbortController()

    const exchangeGoogleCode = async () => {
      if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) {
        setGoogleFeedback(googleAuthMessage.missingApiBaseUrl)
        setGoogleFeedbackType("error")
        return
      }

      setGoogleFeedback(googleAuthMessage.exchangingCode)
      setGoogleFeedbackType("success")

      try {
        const response = await fetch(`${env.apiBaseUrl}/api/auth/google/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: initialGoogleFeedback.code,
            redirect_uri: window.location.origin,
          }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as BackendGoogleAuthResponse

        if (!response.ok) {
          throw new Error(payload.detail ?? payload.message ?? googleAuthMessage.backendAuthFailed)
        }

        if (payload.access) {
          dispatch(setAccessToken(payload.access))
        }
        // refresh_token is set as httpOnly cookie by the backend

        setGoogleFeedback(googleAuthMessage.backendAuthSuccess)
        setGoogleFeedbackType("success")
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        const message = error instanceof Error ? error.message : googleAuthMessage.backendAuthFailed
        setGoogleFeedback(message)
        setGoogleFeedbackType("error")
      }
    }

    void exchangeGoogleCode()
    return () => controller.abort()
  }, [initialGoogleFeedback.code, dispatch])

  useEffect(() => {
    if (initialGoogleFeedback.cleanUrl) {
      window.history.replaceState({}, document.title, initialGoogleFeedback.cleanUrl)
    }
  }, [initialGoogleFeedback.cleanUrl])

  const runGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: window.location.origin,
  })

  const handleGoogleLogin = () => {
    if (env.googleClientId === ENV_NOT_CONFIGURED_VALUE) {
      setGoogleFeedback(googleAuthMessage.missingClientId)
      setGoogleFeedbackType("error")
      return
    }

    setGoogleFeedbackType("success")
    setGoogleFeedback(googleAuthMessage.redirecting)
    runGoogleLogin()
  }

  return { googleFeedback, googleFeedbackType, handleGoogleLogin }
}

export { useGoogleRedirectAuth }
export type { UseGoogleRedirectAuthResult }
