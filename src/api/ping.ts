import { env } from "../config/env"

export async function pingApi(): Promise<{ ok: boolean; statusText: string }> {
  if (!env.apiBaseUrl) {
    return { ok: false, statusText: "API base URL not configured" }
  }

  const apiUrl = env.apiBaseUrl.replace(/\/$/, "")

  try {
    const response = await fetch(apiUrl, { method: "HEAD" })

    return {
      ok: true,
      statusText: `${response.status} ${response.statusText}`,
    }
  } catch (error) {
    return {
      ok: false,
      statusText: error instanceof Error ? error.message : "Network error",
    }
  }
}
