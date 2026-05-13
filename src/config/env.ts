const notConfigured = "Not configured"

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? notConfigured,
  wsUrl: import.meta.env.VITE_WS_URL ?? notConfigured,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? notConfigured,
}
