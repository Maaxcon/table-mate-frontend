// Decode the payload of a JWT without verifying its signature.
// Only for reading public claims the server already issued (e.g. cart_session_id);
// never trust this for authorization. Returns null on malformed input.
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64)) as T
  } catch {
    // Malformed token (bad base64url or not JSON) — treat as no payload.
    return null
  }
}
