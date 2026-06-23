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
    async (
      entities: EditorEntity[],
      deletedTableIds: string[] = [],
      edgeStyles?: Record<string, "dashed" | "solid">,
    ) => {
      setPublishing(true)
      setError(null)
      const layoutJson = serializeEntities(entities)

      rollbackRef.current = onRollback ?? null

      try {
        const data = await api.post<Record<string, unknown>>("/api/editor/layouts/publish/", {
          ...layoutJson,
          edge_styles: edgeStyles ?? {
            top: "dashed",
            right: "dashed",
            bottom: "dashed",
            left: "dashed",
          },
          deleted_table_ids: deletedTableIds,
        })
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
