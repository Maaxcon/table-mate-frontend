import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { useGoogleLogin } from "@react-oauth/google"
import { useEffect, useState } from "react"
import { googleAuthCleanupQueryParams, googleAuthMessage } from "./googleAuth.constants"
import type { GoogleFeedbackType, InitialGoogleFeedback } from "@/types/auth/googleAuth"

type UseGoogleRedirectAuthResult = {
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
  handleGoogleLogin: () => void
}

type BackendGoogleAuthResponse = {
  access?: string
  refresh?: string
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
  const [initialGoogleFeedback] = useState<InitialGoogleFeedback>(() => getInitialGoogleFeedback())
  const [googleFeedback, setGoogleFeedback] = useState<string>(initialGoogleFeedback.message)
  const [googleFeedbackType, setGoogleFeedbackType] = useState<GoogleFeedbackType>(
    initialGoogleFeedback.type,
  )

  useEffect(() => {
    if (!initialGoogleFeedback.code) {
      return
    }

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
        })

        const payload = (await response.json()) as BackendGoogleAuthResponse

        if (!response.ok) {
          throw new Error(payload.detail ?? payload.message ?? googleAuthMessage.backendAuthFailed)
        }

        if (payload.access) {
          localStorage.setItem("tm_access_token", payload.access)
        }
        if (payload.refresh) {
          localStorage.setItem("tm_refresh_token", payload.refresh)
        }

        setGoogleFeedback(googleAuthMessage.backendAuthSuccess)
        setGoogleFeedbackType("success")
      } catch (error) {
        const message = error instanceof Error ? error.message : googleAuthMessage.backendAuthFailed
        setGoogleFeedback(message)
        setGoogleFeedbackType("error")
      }
    }

    void exchangeGoogleCode()
  }, [initialGoogleFeedback.code])

  useEffect(() => {
    if (initialGoogleFeedback.cleanUrl) {
      window.history.replaceState({}, document.title, initialGoogleFeedback.cleanUrl)
    }
  }, [initialGoogleFeedback.cleanUrl])

  const runGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: window.location.origin,
    onSuccess: (tokenResponse) => {
      console.info("Google login success", tokenResponse)
      setGoogleFeedback(googleAuthMessage.successFromCallback)
      setGoogleFeedbackType("success")
    },
    onError: () => {
      setGoogleFeedback(googleAuthMessage.genericError)
      setGoogleFeedbackType("error")
    },
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
