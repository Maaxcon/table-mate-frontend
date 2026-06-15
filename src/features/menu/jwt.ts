export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64)) as T
  } catch {
    return null
  }
}
