import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import { fetchZones } from "@/features/reservation/api"
import type { Zone } from "@/features/reservation/api"
import { apiFetch } from "@/api/client"
import {
  Canvas,
  ConfirmDeleteZoneModal,
  PropertiesSidebar,
  PublishConfirmModal,
  Toolbar,
  ZoneHeader,
} from "@/features/editor/components"
import { useEditorState } from "@/features/editor/hooks/useEditorState"
import type { EditorState } from "@/features/editor/hooks/useEditorState"
import { usePublish } from "@/features/editor/hooks/usePublish"
import type { PublishResult } from "@/features/editor/hooks/usePublish"
import {
  DEFAULT_CANVAS_COLS,
  DEFAULT_CANVAS_ROWS,
  serializeEntities,
  deserializeLayout,
} from "@/features/editor/types"
import type { EditorEntity, LayoutPayload } from "@/features/editor/types"
import "./FloorPlanEditorPage.css"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useHallSubscription } from "@/features/waiter-order-view/hooks/useHallSubscription"

function getTimeString(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

function useCurrentTime(): string {
  const [time, setTime] = useState(getTimeString)

  useEffect(() => {
    const intervalId = setInterval(() => setTime(getTimeString()), 10_000)
    return () => clearInterval(intervalId)
  }, [])

  return time
}

function FloorPlanEditorPage() {
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
    createZone,
    updateZoneMeta,
    deleteZone: deleteZoneMeta,
    clearPendingZones,
    pendingZones,
    dispatch,
  } = useEditorState()

  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const prePublishStateRef = useRef<EditorState | null>(null)
  const publishingRef = useRef(false)
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  // Merge server zones with pending local zone changes so the UI always shows
  // the latest state (including un-published zone creates, renames, deletes).
  const allZones = useMemo((): Zone[] => {
    const serverZones: Zone[] = zones.map((z) => {
      const patch = pendingZones.updated[z.public_id]
      return patch
        ? {
            ...z,
            name: patch.name ?? z.name,
            edge_styles: patch.edge_styles ?? z.edge_styles,
            canvas_cols: patch.canvas_cols ?? z.canvas_cols,
            canvas_rows: patch.canvas_rows ?? z.canvas_rows,
          }
        : z
    })
    const localZones: Zone[] = pendingZones.created.map((z) => {
      const patch = pendingZones.updated[z._clientId]
      return {
        public_id: z._clientId,
        name: patch?.name ?? z.name,
        sort_order: 0,
        edge_styles: patch?.edge_styles ?? z.edge_styles,
        canvas_cols: patch?.canvas_cols ?? z.canvas_cols,
        canvas_rows: patch?.canvas_rows ?? z.canvas_rows,
      }
    })
    return [...serverZones, ...localZones].filter(
      (z) => !pendingZones.deleted.includes(z.public_id),
    )
  }, [zones, pendingZones])

  const selectedZone = useMemo(
    () => allZones.find((z) => z.public_id === selectedZoneId) ?? null,
    [allZones, selectedZoneId],
  )

  const layoutCanvasCols = useMemo(() => {
    if (allZones.length === 0) return DEFAULT_CANVAS_COLS
    return allZones.reduce(
      (max, zone) => Math.max(max, zone.canvas_cols ?? DEFAULT_CANVAS_COLS),
      DEFAULT_CANVAS_COLS,
    )
  }, [allZones])

  const layoutCanvasRows = useMemo(() => {
    if (allZones.length === 0) return DEFAULT_CANVAS_ROWS
    return allZones.reduce(
      (max, zone) => Math.max(max, zone.canvas_rows ?? DEFAULT_CANVAS_ROWS),
      DEFAULT_CANVAS_ROWS,
    )
  }, [allZones])

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
    dispatch({
      type: "SET_CANVAS_SIZE",
      cols: canvasCols,
      rows: canvasRows,
      zoneId: selectedZoneId ?? null,
    })
  }, [canvasCols, canvasRows, dispatch, selectedZoneId])

  useEffect(() => {
    if (!restaurantId) return
    fetchZones(String(restaurantId))
      .then((z) => {
        setZones(z)
        if (z.length > 0) {
          setSelectedZoneId((prev) => prev ?? z[0].public_id)
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

  // Another admin created/renamed/deleted a zone: re-pull the zone list so this editor's
  // zone tabs stay current without a manual refresh. Refetching (rather than patching from the
  // event payload) also picks up fields the event doesn't carry, e.g. canvas dimensions, and
  // mirrors the refreshZones/loadZones pattern used in WaiterOrderView and BookingPage.
  const refreshZones = useCallback(async () => {
    if (!restaurantId) return
    try {
      setZones(await fetchZones(String(restaurantId)))
    } catch {
      // keep current zones on failure
    }
  }, [restaurantId])

  // When another admin publishes a layout, warn about stale work or silently reload.
  const handleOtherAdminPublished = useCallback(async () => {
    if (publishingRef.current) return
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
      refreshZones()
    }
  }, [dirty, loadEntities, toast, refreshZones])

  const handleDiscard = useCallback(async () => {
    clearPendingZones()
    try {
      const [layoutRes, freshZones] = await Promise.all([
        apiFetch(`/api/editor/layouts/latest/`),
        restaurantId ? fetchZones(String(restaurantId)) : Promise.resolve([] as Zone[]),
      ])
      if (layoutRes.ok) {
        const data: { layout_json?: LayoutPayload | null } = await layoutRes.json()
        const lp = data.layout_json
        if (lp && typeof lp === "object") {
          const loaded = deserializeLayout(lp as LayoutPayload)
          loadEntities(loaded, serializeEntities(loaded))
        } else {
          loadEntities([], {})
        }
      }
      setZones(freshZones)
    } catch {
      // keep current state on network failure
    }
  }, [loadEntities, clearPendingZones, restaurantId])

  const { isConnected } = useHallSubscription({
    onLayoutPublished: handleOtherAdminPublished,
    onZoneCreated: refreshZones,
    onZoneUpdated: refreshZones,
    onZoneDeleted: refreshZones,
  })

  const currentTime = useCurrentTime()

  const handleAddZone = useCallback(
    (name: string) => {
      const clientId = crypto.randomUUID()
      createZone(clientId, name)
      setSelectedZoneId(clientId)
    },
    [createZone],
  )

  // Strict filter: only ever show the selected zone's entities. The Canvas is
  // gated behind `noZones`, so when `selectedZoneId` is momentarily null (load
  // race, or a zone deselected via ZoneHeader) we render nothing rather than
  // leaking other zones' grid -1 portals/thresholds into the padding area.
  const visibleEntities = entities.filter((e) => e.zoneId === selectedZoneId)

  const noZones = allZones.length === 0

  const { publish, publishing, error } = usePublish({
    onSuccess: async (result?: PublishResult) => {
      publishingRef.current = false
      // Remap client zone IDs to server zone IDs in entities.
      if (result?.zone_id_map) {
        for (const [clientId, serverId] of Object.entries(result.zone_id_map)) {
          dispatch({ type: "REMAP_ZONE_ID", from: clientId, to: serverId })
        }
      }
      // Apply the new tables' server ids and snapshot the published state in one
      // atomic action so the editor doesn't end up falsely dirty.
      publishSuccess(result?.table_id_map, result?.public_number_map)
      setShowPublishModal(false)
      // Refresh zones from the server (newly created zones now exist, etc.)
      if (restaurantId) {
        try {
          setZones(await fetchZones(String(restaurantId)))
        } catch {
          // keep current zones on failure
        }
      }
    },
    onRollback: () => {
      publishingRef.current = false
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
    publishingRef.current = true
    prePublishStateRef.current = {
      entities,
      selectedId,
      lastPublishedJson,
      dirty,
      activeTool,
      deletedServerIds,
      canvasCols,
      canvasRows,
      pendingZones,
    }
    publish(entities, deletedServerIds, layoutCanvasCols, layoutCanvasRows, pendingZones)
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
    layoutCanvasCols,
    layoutCanvasRows,
    pendingZones,
  ])

  const deleteZoneTableCount = deleteZoneTarget
    ? entities.filter((e) => e.zoneId === deleteZoneTarget.public_id && e.type.startsWith("table-"))
        .length
    : 0

  const selectedEntity = visibleEntities.find((e) => e.id === selectedId) ?? null
  const zoneEntities = useMemo(
    () => entities.filter((e) => e.zoneId === selectedZoneId),
    [entities, selectedZoneId],
  )
  const zoneTables = useMemo(
    () => zoneEntities.filter((e) => e.type.startsWith("table-")).length,
    [zoneEntities],
  )
  const zonePortals = useMemo(
    () => zoneEntities.filter((e) => e.type === "portal").length,
    [zoneEntities],
  )
  const canvasSizeLabel = `${canvasCols} × ${canvasRows}`

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
    (edge: string, style: "dashed" | "solid") => {
      if (!selectedZoneId) return
      const updated = { ...edgeStyles, [edge]: style }
      setZones((prev) =>
        prev.map((z) => (z.public_id === selectedZoneId ? { ...z, edge_styles: updated } : z)),
      )
      updateZoneMeta(selectedZoneId, { edge_styles: updated })
    },
    [selectedZoneId, edgeStyles, updateZoneMeta],
  )

  const handleCanvasSizeChange = useCallback(
    (cols: number, rows: number) => {
      if (!selectedZoneId) return
      setZones((prev) =>
        prev.map((z) =>
          z.public_id === selectedZoneId ? { ...z, canvas_cols: cols, canvas_rows: rows } : z,
        ),
      )
      updateZoneMeta(selectedZoneId, { canvas_cols: cols, canvas_rows: rows })
    },
    [selectedZoneId, updateZoneMeta],
  )

  const handleRenameZone = useCallback(
    (zoneId: string, name: string) => {
      updateZoneMeta(zoneId, { name })
      setZones((prev) => prev.map((z) => (z.public_id === zoneId ? { ...z, name } : z)))
    },
    [updateZoneMeta],
  )

  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      setDeleting(true)
      deleteZoneMeta(zoneId)
      setZones((prev) => prev.filter((z) => z.public_id !== zoneId))
      if (selectedZoneId === zoneId) {
        const remaining = allZones.filter((z) => z.public_id !== zoneId)
        setSelectedZoneId(remaining.length > 0 ? remaining[0].public_id : null)
      }
      setDeleteZoneTarget(null)
      setDeleting(false)
    },
    [selectedZoneId, allZones, deleteZoneMeta],
  )

  return (
    <div className="editor-page">
      <header className="editor-topbar" role="banner">
        <div className="editor-topbar__left">
          <div className="editor-topbar__brand">
            <span className="editor-topbar__logo" aria-hidden="true">
              <span className="editor-topbar__logo-dot" />
            </span>
            <div className="editor-topbar__brand-copy">
              <span className="editor-topbar__brand-title">FLOOR PLAN</span>
              <span className="editor-topbar__brand-subtitle">ADMIN · LAYOUT</span>
            </div>
          </div>
          <div className="editor-topbar__details">
            <div className="editor-topbar__title-row">
              <h1 className="editor-topbar__title">Floor plan designer</h1>
              <span
                className={`editor-topbar__badge ${dirty ? "editor-topbar__badge--dirty" : "editor-topbar__badge--clean"}`}
              >
                {dirty ? "Unsaved" : "Synced"}
              </span>
            </div>
            <p className="editor-topbar__subtitle">
              {selectedZone
                ? `Editing ${selectedZone.name} — adjust seating, portals, and traffic edges before publishing.`
                : "Create a zone to start mapping the dining room."}
            </p>
          </div>
        </div>
        <div className="editor-topbar__right">
          <div className="editor-topbar__metrics" role="group" aria-label="Layout metrics">
            <div className="editor-metric">
              <span className="editor-metric__label">ZONES</span>
              <span className="editor-metric__value">{allZones.length}</span>
              <span className="editor-metric__hint">ACTIVE</span>
            </div>
            <div className="editor-metric">
              <span className="editor-metric__label">TABLES</span>
              <span className="editor-metric__value">{selectedZone ? zoneTables : "—"}</span>
              <span className="editor-metric__hint">
                {selectedZone ? `${zonePortals} portals` : "SELECT ZONE"}
              </span>
            </div>
            <div className="editor-metric">
              <span className="editor-metric__label">GRID</span>
              <span className="editor-metric__value">{selectedZone ? canvasSizeLabel : "—"}</span>
              <span className="editor-metric__hint">COLS × ROWS</span>
            </div>
          </div>
          <div className="editor-topbar__time" aria-label="Local time">
            <span className="editor-topbar__clock">{currentTime}</span>
            <span className="editor-topbar__clock-label">LOCAL TIME</span>
          </div>
          <span
            className={`editor-topbar__connection ${isConnected ? "editor-topbar__connection--online" : ""}`}
            role="status"
            aria-label={isConnected ? "Live updates connected" : "Live updates offline"}
          />
        </div>
      </header>

      <section className="editor-page__panel">
        <Toolbar
          dirty={dirty}
          publishing={publishing}
          activeTool={activeTool}
          onToolSelect={setTool}
          onPublish={() => setShowPublishModal(true)}
          onDiscard={handleDiscard}
        />
        <ZoneHeader
          zones={allZones}
          selectedZoneId={selectedZoneId}
          onZoneSelect={setSelectedZoneId}
          onAddZone={handleAddZone}
          onRenameZone={handleRenameZone}
          onDeleteZone={(zoneId) => {
            const zone = allZones.find((z) => z.public_id === zoneId)
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
              <div className="editor-page__stage">
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
              </div>
              <PropertiesSidebar
                entity={selectedEntity}
                onUpdate={updateEntity}
                onDelete={removeEntity}
                zones={allZones}
                selectedZone={selectedZone}
                onZoneStyleChange={handleZoneStyleChange}
                canvasCols={canvasCols}
                canvasRows={canvasRows}
                onCanvasSizeChange={handleCanvasSizeChange}
              />
            </>
          )}
        </div>
      </section>

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

export default FloorPlanEditorPage
