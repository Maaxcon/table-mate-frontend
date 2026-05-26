import { env } from "@/config/env"
import { store } from "@/store"
import { clearAuth, setAccessToken } from "@/store/auth/authSlice"

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
      const data = (await res.json()) as { access?: string }
      if (!data.access) throw new Error("Refresh failed")
      store.dispatch(setAccessToken(data.access))
      return data.access
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
    store.dispatch(clearAuth())
    return response
  }
}

export { apiFetch }
