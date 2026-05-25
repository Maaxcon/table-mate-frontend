import { env } from "@/config/env"
import { store } from "@/store"
import { clearAccessToken, setAccessToken } from "@/store/auth/authSlice"

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = fetch(`${env.apiBaseUrl}/api/auth/refresh/`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Refresh failed")
      const { access } = (await res.json()) as { access: string }
      store.dispatch(setAccessToken(access))
      return access
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
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
  } catch {
    store.dispatch(clearAccessToken())
    return response
  }
}

export { apiFetch }
