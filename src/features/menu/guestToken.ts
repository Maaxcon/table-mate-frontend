const GUEST_TOKEN_STORAGE_KEY = "tablemate.menu.guest_token.v1"

function createGuestToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getGuestToken(): string {
  if (typeof window === "undefined") {
    return "guest-server"
  }

  try {
    const existing = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)
    if (existing) return existing

    const generated = createGuestToken()
    window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, generated)
    return generated
  } catch {
    return createGuestToken()
  }
}
