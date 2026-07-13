// Remembers the page a guarded route bounced the user from, so a successful
// login can return them there instead of a role-default page. Survives the
// full-page redirect through Google OAuth, so it must live in sessionStorage,
// not React/router state.
const POST_LOGIN_REDIRECT_KEY = "tablemate.post_login_redirect.v1"

export function setPostLoginRedirect(path: string): void {
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path)
  } catch {
    // storage unavailable — the caller falls back to the default redirect
  }
}

/** Non-destructive read — pair with clearPostLoginRedirect() once it's used. */
export function peekPostLoginRedirect(): string | null {
  try {
    return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
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
