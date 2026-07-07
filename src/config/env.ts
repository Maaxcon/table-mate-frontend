export const ENV_NOT_CONFIGURED_VALUE = "Not configured"

export const env = {
  apiBaseUrl:
    window.env?.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? ENV_NOT_CONFIGURED_VALUE,
  wsUrl: window.env?.VITE_WS_URL ?? import.meta.env.VITE_WS_URL ?? ENV_NOT_CONFIGURED_VALUE,
  googleClientId:
    window.env?.VITE_GOOGLE_CLIENT_ID ??
    import.meta.env.VITE_GOOGLE_CLIENT_ID ??
    ENV_NOT_CONFIGURED_VALUE,
}
