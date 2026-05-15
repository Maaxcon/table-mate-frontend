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

function getInitialGoogleFeedback(): InitialGoogleFeedback {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (code) {
    for (const param of googleAuthCleanupQueryParams) {
      url.searchParams.delete(param)
    }

    return {
      message: googleAuthMessage.successFromRedirect,
      type: "success",
      cleanUrl: url.toString(),
    }
  }

  if (error) {
    url.searchParams.delete("error")

    return {
      message: `Google sign-in failed: ${error}.`,
      type: "error",
      cleanUrl: url.toString(),
    }
  }

  return { message: "", type: "success", cleanUrl: null }
}

function useGoogleRedirectAuth(): UseGoogleRedirectAuthResult {
  const [initialGoogleFeedback] = useState<InitialGoogleFeedback>(() => getInitialGoogleFeedback())
  const [googleFeedback, setGoogleFeedback] = useState<string>(initialGoogleFeedback.message)
  const [googleFeedbackType, setGoogleFeedbackType] = useState<GoogleFeedbackType>(
    initialGoogleFeedback.type,
  )

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
