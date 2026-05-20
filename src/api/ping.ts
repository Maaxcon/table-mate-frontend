import { env } from "../config/env"
import type { paths } from "../types/api"

type AuthUsersListResponse =
  paths["/api/auth/users/"]["get"]["responses"]["200"]["content"]["application/json"]

export async function pingApi(): Promise<{ ok: boolean; statusText: string }> {
  if (!env.apiBaseUrl) {
    return { ok: false, statusText: "API base URL not configured" }
  }

  const apiUrl = env.apiBaseUrl.replace(/\/$/, "")
  const url = `${apiUrl}/api/auth/users/`

  try {
    const response = await fetch(url, { method: "GET" })
    const ok = response.ok || response.status === 401 || response.status === 403

    const _sample: AuthUsersListResponse = []
    void _sample

    return {
      ok,
      statusText: `${response.status} ${response.statusText}`,
    }
  } catch (error) {
    return {
      ok: false,
      statusText: error instanceof Error ? error.message : "Network error",
    }
  }
}
