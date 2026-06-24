// Readable hint that this device has had a logged-in session. The refresh
// cookie is httpOnly, so JS can't tell whether a session exists; this flag lets
// us skip the session-restore refresh (and its expected 401) for guests who
// never logged in.
const HAD_SESSION_KEY = "tablemate.had_session.v1"

export function markHadSession(): void {
  try {
    localStorage.setItem(HAD_SESSION_KEY, "1")
  } catch {
    // storage unavailable — fall back to always attempting refresh
  }
}

export function clearHadSession(): void {
  try {
    localStorage.removeItem(HAD_SESSION_KEY)
  } catch {
    // ignore
  }
}

export function hasHadSession(): boolean {
  try {
    return localStorage.getItem(HAD_SESSION_KEY) === "1"
  } catch {
    return false
  }
}
