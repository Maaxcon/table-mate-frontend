export {}

declare global {
  interface Window {
    env?: {
      VITE_API_BASE_URL?: string
      VITE_WS_URL?: string
      GOOGLE_CLIENT_ID?: string
    }
  }
}
