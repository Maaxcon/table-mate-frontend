export const googleAuthMessage = {
  successFromRedirect: "Google sign-in success. Next step: backend code exchange.",
  successFromCallback: "Google sign-in success. Next step: backend token exchange.",
  genericError: "Google sign-in failed. Please try again.",
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
