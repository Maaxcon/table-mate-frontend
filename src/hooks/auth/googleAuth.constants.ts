export const googleAuthMessage = {
  successFromRedirect: "Google sign-in success. Completing backend authorization...",
  exchangingCode: "Exchanging Google code with backend...",
  backendAuthSuccess: "Signed in successfully.",
  backendAuthFailed: "Google sign-in succeeded, but backend authorization failed.",
  genericError: "Google sign-in failed. Please try again.",
  missingApiBaseUrl: "Set VITE_API_BASE_URL in .env to enable backend authorization.",
  missingClientId: "Set VITE_GOOGLE_CLIENT_ID in .env to enable Google sign-in.",
  redirecting: "Redirecting to Google...",
} as const

export const googleAuthCleanupQueryParams = [
  "code",
  "scope",
  "authuser",
  "prompt",
  "error",
] as const
