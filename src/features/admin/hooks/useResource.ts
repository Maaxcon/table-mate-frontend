import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"

type UseResourceOptions<T> = {
  /** When false, the fetch is skipped and data is cleared (e.g. no menu selected). */
  enabled?: boolean
  /** Message stored in `error` when the fetch fails. */
  errorMessage?: string
  /** Called after a successful load (e.g. to pick a default selection). */
  onSuccess?: (data: T) => void
}

type UseResourceResult<T> = {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: Dispatch<SetStateAction<T | null>>
}

/**
 * Loads data with the common admin pattern: an aborted-on-unmount fetch, plus
 * `loading`/`error` state and a `reload()` that re-runs it. Pass a memoized
 * `fetcher` (wrap in useCallback if it closes over props) so the effect is
 * stable. `setData` is exposed for optimistic updates.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  { enabled = true, errorMessage = "Could not load data.", onSuccess }: UseResourceOptions<T> = {},
): UseResourceResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Keep the latest onSuccess without making it an effect dependency.
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      if (!enabled) {
        setData(null)
        setError(null)
        setLoading(false)
        return
      }
      // Clear stale data so a changed fetcher (e.g. switching menus) doesn't
      // keep showing the previous result while the new one loads.
      setData(null)
      setLoading(true)
      try {
        const result = await fetcher(controller.signal)
        setData(result)
        setError(null)
        onSuccessRef.current?.(result)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(errorMessage)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [fetcher, enabled, errorMessage, reloadKey])

  return { data, loading, error, reload, setData }
}
