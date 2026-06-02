import { env } from "@/config/env"
import { store } from "@/store"
import { clearAuth, setAccessToken } from "@/store/auth/authSlice"

let refreshPromise: Promise<string> | null = null
let refreshFailedForAccessToken: string | null | undefined

class RefreshAuthError extends Error {
  constructor() {
    super("Refresh token rejected")
  }
}

async function refreshAccessToken(): Promise<string> {
  const accessToken = store.getState().auth.accessToken

  if (refreshFailedForAccessToken !== undefined && refreshFailedForAccessToken === accessToken) {
    throw new RefreshAuthError()
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const res = await fetch(`${env.apiBaseUrl}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })

    if (res.status === 401 || res.status === 403) {
      refreshFailedForAccessToken = accessToken
      throw new RefreshAuthError()
    }

    if (!res.ok) throw new Error("Refresh failed")

    const data = (await res.json()) as { access?: string }
    if (!data.access) throw new Error("Refresh failed")

    refreshFailedForAccessToken = undefined
    store.dispatch(setAccessToken(data.access))
    return data.access
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

async function ensureSession(): Promise<string | null> {
  try {
    return await refreshAccessToken()
  } catch (err) {
    if (err instanceof RefreshAuthError) {
      refreshFailedForAccessToken = null
      store.dispatch(clearAuth())
      return null
    }
    throw err
  }
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = store.getState().auth.accessToken

  const headers = new Headers(init.headers)
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })

  if (response.status !== 401) {
    return response
  }

  try {
    const newToken = await refreshAccessToken()
    const retryHeaders = new Headers(init.headers)
    retryHeaders.set("Authorization", `Bearer ${newToken}`)
    return fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    })
  } catch (err) {
    if (err instanceof RefreshAuthError) {
      refreshFailedForAccessToken = null
      store.dispatch(clearAuth())
    }
    return response
  }
}

export { apiFetch, ensureSession }
