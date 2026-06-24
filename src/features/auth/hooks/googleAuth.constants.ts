export const googleAuthMessage = {
  successFromRedirect: "Signing you in…",
  exchangingCode: "Signing you in…",
  backendAuthSuccess: "You're signed in.",
  backendAuthFailed: "Couldn't sign you in. Please try again.",
  redirectFailed: "Couldn't sign you in with Google. Please try again.",
  missingApiBaseUrl: "Sign-in is unavailable right now. Please try again later.",
  missingClientId: "Sign-in is unavailable right now. Please try again later.",
  redirecting: "Taking you to Google…",
} as const

export const googleAuthCleanupQueryParams = [
  "code",
  "scope",
  "authuser",
  "prompt",
  "error",
] as const
