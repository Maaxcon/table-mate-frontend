import { useCallback, useRef, useState } from "react"
import { api } from "@/api/client"
import { serializeEntities } from "../types"
import type { EditorEntity } from "../types"
import type { LayoutVersion } from "@/types/api"

/**
 * The publish endpoint returns the new {@link LayoutVersion} plus a map of
 * client entity id → server table id for tables created in this publish. The
 * map is not part of the generated schema response, so it is modelled here.
 */
export interface PublishResult extends LayoutVersion {
  table_id_map?: Record<string, string>
}

interface UsePublishOptions {
  onSuccess: (result?: PublishResult) => void
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
      canvasCols?: number,
      canvasRows?: number,
    ) => {
      setPublishing(true)
      setError(null)
      const body: Record<string, unknown> = {
        ...serializeEntities(entities),
        deleted_table_ids: deletedTableIds,
      }
      if (canvasCols !== undefined) body.canvas_cols = canvasCols
      if (canvasRows !== undefined) body.canvas_rows = canvasRows

      rollbackRef.current = onRollback ?? null

      try {
        const data = await api.post<PublishResult>("/api/editor/layouts/publish/", body)
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
