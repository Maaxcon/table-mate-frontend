import i18n from "@/i18n/config"

// An error carrying a backend domain-error code (common/exceptions.py sets
// `code` on every DomainError; the API layers copy it onto the thrown Error).
type CodedError = Error & { code?: string }

function codeOf(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined
  const code = (err as CodedError).code
  return typeof code === "string" && code ? code : undefined
}

/**
 * A translated message for a failed request.
 *
 * The backend's `detail` is English-only, so rendering it directly left a
 * Ukrainian guest reading English mid-flow. Translate off the stable `code`
 * instead and fall back to the caller's own generic string for anything
 * unrecognised — an unmapped code should read as a generic failure, never as
 * raw server text.
 */
export function serverErrorMessage(err: unknown, fallback: string): string {
  const code = codeOf(err)
  if (!code) return fallback
  const key = `errors.server.${code}`
  const translated = i18n.t(key)
  // i18next echoes the key back when it isn't defined.
  return translated === key ? fallback : translated
}
