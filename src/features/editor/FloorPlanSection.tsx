import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import { fetchZones, updateZone, deleteZone } from "@/features/reservation/api"
import type { Zone } from "@/features/reservation/api"
import { apiFetch } from "@/api/client"
import { Toolbar } from "./Toolbar"
import { Canvas } from "./Canvas"
import { PropertiesSidebar } from "./PropertiesSidebar"
import { PublishConfirmModal } from "./PublishConfirmModal"
import { ConfirmDeleteZoneModal } from "./ConfirmDeleteZoneModal"
import { ZoneHeader } from "./ZoneHeader"
import { useEditorState } from "./hooks/useEditorState"
import type { EditorState } from "./hooks/useEditorState"
import { usePublish } from "./hooks/usePublish"
import type { PublishResult } from "./hooks/usePublish"
import {
  DEFAULT_CANVAS_COLS,
  DEFAULT_CANVAS_ROWS,
  serializeEntities,
  deserializeLayout,
} from "./types"
import type { EditorEntity, LayoutPayload } from "./types"
import "./Toolbar.css"
import "./Canvas.css"
import "./PropertiesSidebar.css"
import "./FloorPlanSection.css"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useHallSubscription } from "@/features/waiter-order-view/hooks/useHallSubscription"

function FloorPlanSection() {
  const {
    entities,
    selectedId,
    dirty,
    activeTool,
    lastPublishedJson,
    addEntity,
    updateEntity,
    moveEntity,
    removeEntity,
    selectEntity,
    setTool,
    publishSuccess,
    loadEntities,
    deletedServerIds,
    removeEntitiesByZone,
    dispatch,
  } = useEditorState()

  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const prePublishStateRef = useRef<EditorState | null>(null)
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const selectedZone = useMemo(
    () => zones.find((z) => z.public_id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  )

  const edgeStyles = useMemo(
    () =>
      selectedZone?.edge_styles ?? {
        top: "dashed" as const,
        right: "dashed" as const,
        bottom: "dashed" as const,
        left: "dashed" as const,
      },
    [selectedZone],
  )

  const canvasCols = selectedZone?.canvas_cols ?? DEFAULT_CANVAS_COLS
  const canvasRows = selectedZone?.canvas_rows ?? DEFAULT_CANVAS_ROWS

  // Keep editor state in sync when zone changes canvas dimensions.
  useEffect(() => {
    dispatch({ type: "SET_CANVAS_SIZE", cols: canvasCols, rows: canvasRows })
  }, [canvasCols, canvasRows, dispatch])

  useEffect(() => {
    if (!restaurantId) return
    fetchZones(String(restaurantId))
      .then((z) => {
        setZones(z)
        if (z.length > 0 && !selectedZoneId) {
          setSelectedZoneId(z[0].public_id)
        }
      })
      .catch(() => setZones([]))
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    apiFetch(`/api/editor/layouts/latest/`)
      .then((res) => (res.ok ? res.json() : { layout_json: null }))
      .then((data: { layout_json?: LayoutPayload | null }) => {
        const lp = data.layout_json
        if (lp && typeof lp === "object") {
          const loaded = deserializeLayout(lp as LayoutPayload)
          loadEntities(loaded, serializeEntities(loaded))
        } else {
          loadEntities([], {})
        }
      })
      .catch(() => {})
  }, [restaurantId, loadEntities])

  // When another admin publishes a layout, warn about stale work or silently reload.
  const handleOtherAdminPublished = useCallback(async () => {
    if (dirty) {
      toast.action(
        "Layout was updated by another admin. Reload to see changes (your unsaved work will be lost).",
        "Reload now",
        () => window.location.reload(),
      )
    } else {
      try {
        const res = await apiFetch(`/api/editor/layouts/latest/`)
        if (res.ok) {
          const data: { layout_json?: LayoutPayload | null } = await res.json()
          const lp = data.layout_json
          if (lp && typeof lp === "object") {
            const loaded = deserializeLayout(lp as LayoutPayload)
            loadEntities(loaded, serializeEntities(loaded))
          } else {
            loadEntities([], {})
          }
        }
      } catch {
        // keep current state
      }
    }
  }, [dirty, loadEntities, toast])

  useHallSubscription({ onLayoutPublished: handleOtherAdminPublished })

  const handleAddZone = useCallback(async (name: string) => {
    const res = await apiFetch("/api/restaurants/zones/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error("Failed to create zone")
    const zone = (await res.json()) as Zone
    setZones((prev) => [...prev, zone])
  }, [])

  // Strict filter: only ever show the selected zone's entities. The Canvas is
  // gated behind `noZones`, so when `selectedZoneId` is momentarily null (load
  // race, or a zone deselected via ZoneHeader) we render nothing rather than
  // leaking other zones' grid -1 portals/thresholds into the padding area.
  const visibleEntities = entities.filter((e) => e.zoneId === selectedZoneId)

  const noZones = zones.length === 0

  const { publish, publishing, error } = usePublish({
    onSuccess: (result?: PublishResult) => {
      // Apply the new tables' server ids and snapshot the published state in one
      // atomic action so the editor doesn't end up falsely dirty.
      publishSuccess(result?.table_id_map)
      setShowPublishModal(false)
    },
    onRollback: () => {
      if (prePublishStateRef.current) {
        dispatch({ type: "PUBLISH_ROLLBACK", previousState: prePublishStateRef.current })
        prePublishStateRef.current = null
      }
    },
  })

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const handlePublishConfirm = useCallback(() => {
    prePublishStateRef.current = {
      entities,
      selectedId,
      lastPublishedJson,
      dirty,
      activeTool,
      deletedServerIds,
      canvasCols,
      canvasRows,
    }
    publish(entities, deletedServerIds, canvasCols, canvasRows)
  }, [
    publish,
    entities,
    selectedId,
    lastPublishedJson,
    dirty,
    activeTool,
    deletedServerIds,
    canvasCols,
    canvasRows,
  ])

  const deleteZoneTableCount = deleteZoneTarget
    ? entities.filter((e) => e.zoneId === deleteZoneTarget.public_id && e.type.startsWith("table-"))
        .length
    : 0

  const selectedEntity = visibleEntities.find((e) => e.id === selectedId) ?? null

  const handleCanvasClick = useCallback(
    (gridX: number, gridY: number) => {
      if (activeTool && activeTool !== "select" && activeTool !== "pan") {
        if (!selectedZoneId) return
        const entity = addEntity(activeTool as EditorEntity["type"], gridX, gridY, {
          zoneId: selectedZoneId,
        })
        setTool("select")
        if (entity) selectEntity(entity.id)
      }
    },
    [activeTool, addEntity, selectedZoneId, setTool, selectEntity],
  )

  const handleZoneStyleChange = useCallback(
    async (edge: string, style: "dashed" | "solid") => {
      if (!selectedZoneId) return
      const zone = zones.find((z) => z.public_id === selectedZoneId)
      if (!zone) return
      const updated = { ...(zone.edge_styles ?? {}), [edge]: style }
      setZones((prev) =>
        prev.map((z) => (z.public_id === selectedZoneId ? { ...z, edge_styles: updated } : z)),
      )
      await updateZone(selectedZoneId, { edge_styles: updated })
    },
    [selectedZoneId, zones],
  )

  const handleCanvasSizeChange = useCallback(
    async (cols: number, rows: number) => {
      if (!selectedZoneId) return
      setZones((prev) =>
        prev.map((z) =>
          z.public_id === selectedZoneId ? { ...z, canvas_cols: cols, canvas_rows: rows } : z,
        ),
      )
      await updateZone(selectedZoneId, { canvas_cols: cols, canvas_rows: rows })
    },
    [selectedZoneId],
  )

  const handleRenameZone = useCallback(async (zoneId: string, name: string) => {
    await updateZone(zoneId, { name })
    setZones((prev) => prev.map((z) => (z.public_id === zoneId ? { ...z, name } : z)))
  }, [])

  const handleDeleteZone = useCallback(
    async (zoneId: string) => {
      setDeleting(true)
      try {
        await deleteZone(zoneId)
        setZones((prev) => prev.filter((z) => z.public_id !== zoneId))
        removeEntitiesByZone(zoneId)
        if (selectedZoneId === zoneId) {
          const remaining = zones.filter((z) => z.public_id !== zoneId)
          setSelectedZoneId(remaining.length > 0 ? remaining[0].public_id : null)
        }
        setDeleteZoneTarget(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete zone")
      } finally {
        setDeleting(false)
      }
    },
    [selectedZoneId, zones, removeEntitiesByZone, toast],
  )

  return (
    <div className="editor-page">
      <Toolbar
        dirty={dirty}
        publishing={publishing}
        activeTool={activeTool}
        onToolSelect={setTool}
        onPublish={() => setShowPublishModal(true)}
        onDiscard={() => loadEntities([], {})}
      />
      <ZoneHeader
        zones={zones}
        selectedZoneId={selectedZoneId}
        onZoneSelect={setSelectedZoneId}
        onAddZone={handleAddZone}
        onRenameZone={handleRenameZone}
        onDeleteZone={(zoneId) => {
          const zone = zones.find((z) => z.public_id === zoneId)
          if (zone) setDeleteZoneTarget(zone)
        }}
      />
      <div className="editor-page__body">
        {noZones ? (
          <div className="editor-page__empty">
            <p>Please create a zone to start editing the floor plan.</p>
          </div>
        ) : (
          <>
            <Canvas
              entities={visibleEntities}
              selectedId={selectedId}
              activeTool={activeTool}
              onEntityMove={(id, x, y) => moveEntity(id, x, y, selectedZoneId ?? undefined)}
              onEntitySelect={selectEntity}
              onCanvasClick={handleCanvasClick}
              onEntityResize={(id, w, h) => updateEntity(id, { w, h })}
              edgeStyles={edgeStyles}
              canvasCols={canvasCols}
              canvasRows={canvasRows}
            />
            <PropertiesSidebar
              entity={selectedEntity}
              onUpdate={updateEntity}
              onDelete={removeEntity}
              zones={zones}
              selectedZone={selectedZone}
              onZoneStyleChange={handleZoneStyleChange}
              canvasCols={canvasCols}
              canvasRows={canvasRows}
              onCanvasSizeChange={handleCanvasSizeChange}
            />
          </>
        )}
      </div>

      {showPublishModal && (
        <PublishConfirmModal
          onConfirm={handlePublishConfirm}
          onClose={() => setShowPublishModal(false)}
          busy={publishing}
        />
      )}

      {deleteZoneTarget && (
        <ConfirmDeleteZoneModal
          zoneName={deleteZoneTarget.name}
          tableCount={deleteZoneTableCount}
          onConfirm={() => handleDeleteZone(deleteZoneTarget.public_id)}
          onClose={() => setDeleteZoneTarget(null)}
          busy={deleting}
        />
      )}
    </div>
  )
}

export default FloorPlanSection
