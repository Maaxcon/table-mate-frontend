import { useCallback, useRef, useState } from "react"
import { api } from "@/api/client"
import { serializeEntities } from "../types"
import type { EditorEntity } from "../types"
import type { LayoutVersion } from "@/types/api"
import type { PendingZones } from "./useEditorState"

/**
 * The publish endpoint returns the new {@link LayoutVersion} plus maps of
 * client entity id → server table id and client zone id → server zone id
 * for resources created in this publish. The maps are not part of the
 * generated schema response, so they are modelled here.
 */
export interface PublishResult extends LayoutVersion {
  table_id_map?: Record<string, string>
  public_number_map?: Record<string, string>
  zone_id_map?: Record<string, string>
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
      pendingZones?: PendingZones,
    ) => {
      setPublishing(true)
      setError(null)
      const body: Record<string, unknown> = {
        ...serializeEntities(entities),
        deleted_table_ids: deletedTableIds,
      }
      if (canvasCols !== undefined) body.canvas_cols = canvasCols
      if (canvasRows !== undefined) body.canvas_rows = canvasRows
      if (pendingZones) {
        body.zones = {
          created: pendingZones.created.map((z) => ({
            _client_id: z._clientId,
            name: z.name,
            edge_styles: z.edge_styles,
            canvas_cols: z.canvas_cols,
            canvas_rows: z.canvas_rows,
          })),
          updated: Object.entries(pendingZones.updated).map(([k, v]) => ({
            public_id: k,
            ...v,
          })),
          deleted: pendingZones.deleted,
        }
      }

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
