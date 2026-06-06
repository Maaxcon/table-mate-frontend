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

/** DRF's paginated list response. */
export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Reads the first field error DRF returns, e.g. {"email": ["already exists"]}. */
export async function firstError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const first = Object.values(data)[0]
    if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    if (typeof first === "string") return first
  } catch {
    // ignore parse errors
  }
  return fallback
}

type Query = Record<string, string | number | boolean | undefined>

type RequestOptions = {
  /** Query-string params; undefined values are skipped. */
  query?: Query
  signal?: AbortSignal
  /** Fallback message when the response has no field error. */
  errorMessage?: string
}

function withQuery(path: string, query?: Query): string {
  if (!query) return path
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `${path}?${s}` : path
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { query, signal, errorMessage = "Request failed." }: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = { method, signal }
  if (body instanceof FormData) {
    init.body = body // browser sets the multipart boundary
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" }
    init.body = JSON.stringify(body)
  }
  const res = await apiFetch(withQuery(path, query), init)
  if (!res.ok) throw new Error(await firstError(res, errorMessage))
  // 204 (and other empty bodies) decode to undefined.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// Safety cap so a misbehaving "next" can't loop forever (100 pages × 20 = 2000).
const MAX_PAGES = 100

/**
 * Thin typed wrapper over apiFetch: builds the query string, JSON-encodes the
 * body (FormData passes through), parses DRF errors, and returns parsed JSON.
 * `getList` returns the first page; `getAllList` follows pagination to the end.
 */
export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  getList: async <T>(path: string, opts?: RequestOptions): Promise<T[]> =>
    (await request<Paginated<T>>("GET", path, undefined, opts)).results,
  /** Fetches every page of a paginated endpoint and concatenates the results. */
  getAllList: async <T>(path: string, opts?: RequestOptions): Promise<T[]> => {
    const all: T[] = []
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const data = await request<Paginated<T>>("GET", path, undefined, {
        ...opts,
        query: { ...opts?.query, page },
      })
      all.push(...data.results)
      if (!data.next) break
    }
    return all
  },
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, body, opts),
  del: (path: string, opts?: RequestOptions) => request<void>("DELETE", path, undefined, opts),
}

export { apiFetch, ensureSession }
