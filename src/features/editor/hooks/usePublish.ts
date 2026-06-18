import { useCallback, useRef, useState } from "react"
import { api } from "@/api/client"
import { serializeEntities } from "../types"
import type { EditorEntity } from "../types"

interface UsePublishOptions {
  onSuccess: (result?: Record<string, unknown>) => void
  onRollback?: () => void
}

export function usePublish({ onSuccess, onRollback }: UsePublishOptions) {
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rollbackRef = useRef<(() => void) | null>(null)

  const publish = useCallback(
    async (entities: EditorEntity[]) => {
      setPublishing(true)
      setError(null)
      const layoutJson = serializeEntities(entities)

      rollbackRef.current = onRollback

      try {
        const res = await api.post("/api/editor/layouts/publish/", layoutJson)
        if (!res.ok) {
          throw new Error(`Publish failed with status ${res.status}`)
        }
        const data = await res.json()
        onSuccess(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Publish failed")
        rollbackRef.current?.()
      } finally {
        setPublishing(false)
      }
    },
    [onSuccess, onRollback],
  )

  return { publish, publishing, error }
}
