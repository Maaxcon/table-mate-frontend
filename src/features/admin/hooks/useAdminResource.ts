import { useCallback, useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/api/client"

type Paginated<T> = { results: T[] }

export type SaveStatus = "idle" | "saving" | "saved" | "error"

type UseAdminResourceResult<T> = {
  form: T | null
  loading: boolean
  loadError: string | null
  status: SaveStatus
  saveError: string | null
  /** True when the form differs from the last loaded/saved values. */
  dirty: boolean
  setField: <K extends keyof T>(key: K, value: T[K]) => void
  submit: () => Promise<void>
}

/**
 * Loads a restaurant-scoped resource (the admin's only row) from `basePath`
 * and saves edits with PATCH `${basePath}${public_id}/`. The list endpoint is
 * already scoped to the admin's restaurant by the auth context, so we take the
 * first result.
 */
export function useAdminResource<T extends { public_id: string }>(
  basePath: string,
): UseAdminResourceResult<T> {
  const [form, setForm] = useState<T | null>(null)
  // The pristine values to compare against, so we know when there are edits.
  const [saved, setSaved] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      try {
        const res = await apiFetch(basePath, { signal })
        if (!res.ok) throw new Error("load failed")
        const data = (await res.json()) as Paginated<T>
        const first = data.results[0]
        if (!first) throw new Error("empty")
        setForm(first)
        setSaved(first)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setLoadError("Could not load this section.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [basePath])

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setStatus("idle")
  }, [])

  const submit = useCallback(async () => {
    if (!form) return
    setStatus("saving")
    setSaveError(null)
    try {
      const res = await apiFetch(`${basePath}${form.public_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("save failed")
      const updated = (await res.json()) as T
      setForm(updated)
      setSaved(updated)
      setStatus("saved")
    } catch {
      setStatus("error")
      setSaveError("Could not save changes. Please try again.")
    }
  }, [basePath, form])

  const dirty = useMemo(
    () => (form && saved ? JSON.stringify(form) !== JSON.stringify(saved) : false),
    [form, saved],
  )

  // Warn before the tab is closed or reloaded while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  return { form, loading, loadError, status, saveError, dirty, setField, submit }
}
