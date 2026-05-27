const GUEST_TOKEN_STORAGE_KEY = "tablemate.menu.guest_token.v1"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

function createGuestToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function getGuestToken(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-0000-0000-000000000000"
  }

  try {
    const existing = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY)
    if (existing && isValidUUID(existing)) return existing

    const generated = createGuestToken()
    window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, generated)
    return generated
  } catch {
    return createGuestToken()
  }
}
