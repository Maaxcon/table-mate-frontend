export const ENV_NOT_CONFIGURED_VALUE = "Not configured"

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? ENV_NOT_CONFIGURED_VALUE,
  wsUrl: import.meta.env.VITE_WS_URL ?? ENV_NOT_CONFIGURED_VALUE,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ENV_NOT_CONFIGURED_VALUE,
}
