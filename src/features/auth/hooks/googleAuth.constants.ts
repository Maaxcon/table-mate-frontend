export const googleAuthMessage = {
  signingIn: "Signing you in…",
  backendAuthSuccess: "You're signed in.",
  backendAuthFailed: "Couldn't sign you in. Please try again.",
  redirectFailed: "Couldn't sign you in with Google. Please try again.",
  unavailable: "Sign-in is unavailable right now. Please try again later.",
  redirecting: "Taking you to Google…",
} as const

export const googleAuthStateStorageKey = "tablemate.auth.google_state"

export const googleAuthCleanupQueryParams = [
  "code",
  "scope",
  "authuser",
  "prompt",
  "error",
  "state",
] as const
