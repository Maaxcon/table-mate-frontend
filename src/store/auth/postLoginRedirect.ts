// Remembers the page a guarded route bounced the user from, so a successful
// login can return them there instead of a role-default page. Survives the
// full-page redirect through Google OAuth, so it must live in sessionStorage,
// not React/router state.
const POST_LOGIN_REDIRECT_KEY = "tablemate.post_login_redirect.v1"

// Long enough to cover a normal Google OAuth round trip; short enough that an
// abandoned login attempt (e.g. bounced, then browsed as guest instead) can't
// leak into a much later, unrelated login on the same tab — e.g. a different
// person on a shared/kiosk device.
const MAX_AGE_MS = 5 * 60 * 1000

type StoredRedirect = { path: string; setAt: number }

export function setPostLoginRedirect(path: string): void {
  try {
    const entry: StoredRedirect = { path, setAt: Date.now() }
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, JSON.stringify(entry))
  } catch {
    // storage unavailable — the caller falls back to the default redirect
  }
}

/** Non-destructive read — pair with clearPostLoginRedirect() once it's used. */
export function peekPostLoginRedirect(): string | null {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as StoredRedirect
    if (Date.now() - entry.setAt > MAX_AGE_MS) return null
    return entry.path
  } catch {
    return null
  }
}

export function clearPostLoginRedirect(): void {
  try {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  } catch {
    // ignore
  }
}
