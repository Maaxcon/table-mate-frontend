import { env } from "@/config/env"
import { store } from "@/store"
import { clearAuth, setAccessToken } from "@/store/auth/authSlice"

let refreshPromise: Promise<string> | null = null
let refreshFailedForAccessToken: string | null | undefined

let consecutiveRemintFailures = 0
const MAX_REMINT_FAILURES = 3

class RefreshAuthError extends Error {
  constructor() {
    super("Refresh token rejected")
  }
}

export async function refreshAccessToken(): Promise<string> {
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

  const url = path.startsWith("http") ? path : `${env.apiBaseUrl}${path}`
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  })

  if (response.status !== 401) {
    return response
  }

  if (consecutiveRemintFailures >= MAX_REMINT_FAILURES) {
    refreshFailedForAccessToken = null
    consecutiveRemintFailures = 0
    store.dispatch(clearAuth())
    return response
  }

  try {
    const newToken = await refreshAccessToken()
    const retryHeaders = new Headers(init.headers)
    retryHeaders.set("Authorization", `Bearer ${newToken}`)
    const retry = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    })
    if (retry.status === 401) {
      consecutiveRemintFailures += 1
    } else {
      consecutiveRemintFailures = 0
    }
    return retry
  } catch (err) {
    if (err instanceof RefreshAuthError) {
      refreshFailedForAccessToken = null
      consecutiveRemintFailures = 0
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

/** Recursively finds the first string message in a nested DRF error. */
function findFirstString(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstString(item)
      if (found) return found
    }
  }
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const found = findFirstString(v)
      if (found) return found
    }
  }
  return undefined
}

/** Reads the first field error DRF returns, e.g. {"email": ["already exists"]}. */
export async function firstError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>
    const found = findFirstString(data)
    if (found) return found
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

// Accept both DRF's paginated shape and a plain array (pagination disabled, or a
// custom action that returns a bare list), so callers don't crash on `.results`.
function pageResults<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

/**
 * Thin typed wrapper over apiFetch: builds the query string, JSON-encodes the
 * body (FormData passes through), parses DRF errors, and returns parsed JSON.
 * `getList` returns the first page; `getAllList` follows pagination to the end.
 */
export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  getList: async <T>(path: string, opts?: RequestOptions): Promise<T[]> =>
    pageResults(await request<Paginated<T> | T[]>("GET", path, undefined, opts)),
  /** Fetches every page of a paginated endpoint and concatenates the results. */
  getAllList: async <T>(path: string, opts?: RequestOptions): Promise<T[]> => {
    const all: T[] = []
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const data = await request<Paginated<T> | T[]>("GET", path, undefined, {
        ...opts,
        query: { ...opts?.query, page },
      })
      all.push(...pageResults(data))
      // A plain array has no "next", so we stop after the first response.
      if (Array.isArray(data) || !data.next) break
    }
    return all
  },
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, body, opts),
  del: (path: string, opts?: RequestOptions) => request<void>("DELETE", path, undefined, opts),
}

/** The current logged-in user's access token, or null when anonymous. */
function getAccessToken(): string | null {
  return store.getState().auth.accessToken
}

export { apiFetch, ensureSession, getAccessToken }
