import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import { fetchLayoutData, fetchZones } from "@/features/reservation/api"
import type { Zone } from "@/features/reservation/api"
import { apiFetch } from "@/api/client"
import {
  Canvas,
  ConfirmDeleteZoneModal,
  PropertiesSidebar,
  PublishConfirmModal,
  SyncLayoutConfirmModal,
  TableQrModal,
  Toolbar,
  ZoneHeader,
} from "@/features/editor/components"
import { getNextTableLabel, useEditorState } from "@/features/editor/hooks/useEditorState"
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
import { DraftSaveConflictError, fetchDraft, saveDraft, deleteDraft } from "@/features/editor/api"
import "./FloorPlanEditorPage.css"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

function isTableEntity(entity: EditorEntity): boolean {
  return entity.type === "table-square" || entity.type === "table-round"
}

function FloorPlanEditorPage() {
  const {
    entities,
    selectedId,
    dirty,
    activeTool,
    lastPublishedJson,
    addEntity,
    addEntities,
    updateEntity,
    moveEntity,
    moveEntitiesByDelta,
    removeEntity,
    removeEntities,
    selectEntity,
    setTool,
    publishSuccess,
    loadEntities,
    deletedServerIds,
    createZone,
    updateZoneMeta,
    updateZoneCanvasSize,
    deleteZone: deleteZoneMeta,
    clearPendingZones,
    pendingZones,
    past,
    future,
    undo,
    redo,
    dispatch,
  } = useEditorState()

  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const prePublishStateRef = useRef<EditorState | null>(null)
  const publishingRef = useRef(false)
  const copiedEntitiesRef = useRef<EditorEntity[]>([])
  const copiedBoundsRef = useRef<{ minX: number; minY: number }>({ minX: 0, minY: 0 })
  const pasteStepRef = useRef(0)
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [qrTarget, setQrTarget] = useState<{ publicId: string; label: string } | null>(null)
  const toast = useToast()
  const [baseLayoutVersionId, setBaseLayoutVersionId] = useState<string | null>(null)
  const [loadedDraft, setLoadedDraft] = useState<boolean | null>(null)
  const strings = useAdminStrings()
  const pageStrings = strings.floor.page

  // Tables that currently have guests seated (open session). Deleting one is
  // blocked up front — the publish would reject it anyway — so we warn instead.
  // Uses the unpaginated /layout/ endpoint (like BookingPage) rather than the
  // paginated /tables/ list — the latter only returns page 1 (20 tables), so a
  // restaurant with more than that would silently miss occupied tables past it.
  const [occupiedTableIds, setOccupiedTableIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!restaurantId) return
    fetchLayoutData(String(restaurantId))
      .then((data) => {
        setOccupiedTableIds(
          new Set(data.tables.filter((t) => t.is_occupied).map((t) => t.public_id)),
        )
      })
      .catch(() => setOccupiedTableIds(new Set()))
  }, [restaurantId])

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

    async function loadLayout() {
      try {
        const draft = await fetchDraft()
        const lp = draft.draft_json
        setLoadedDraft(draft.is_draft)
        setBaseLayoutVersionId(draft.base_layout_version_id)
        if (lp && typeof lp === "object") {
          const loaded = deserializeLayout(lp as LayoutPayload)
          loadEntities(loaded, serializeEntities(loaded))
          return
        }
      } catch {
        // draft endpoint unavailable — fall through to latest
      }

      // Fallback: load latest published layout directly
      try {
        const res = await apiFetch("/api/editor/layouts/latest/")
        if (!res.ok) return
        const data: { layout_json?: LayoutPayload | null; layout_version_id?: string | null } =
          await res.json()
        setLoadedDraft(false)
        setBaseLayoutVersionId(data.layout_version_id ?? null)
        const lp = data.layout_json
        if (lp && typeof lp === "object") {
          const loaded = deserializeLayout(lp as LayoutPayload)
          loadEntities(loaded, serializeEntities(loaded))
        } else {
          loadEntities([], {})
        }
      } catch {
        loadEntities([], {})
      }
    }

    loadLayout()
  }, [restaurantId, loadEntities])

  // ------------------------------------------------------------------
  // Auto-save draft on entity change (debounced 2s)
  // ------------------------------------------------------------------
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [draftConflict, setDraftConflict] = useState(false)

  useEffect(() => {
    if (!restaurantId || !dirty) {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      return
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      setDraftSaving(true)
      try {
        const body: Record<string, unknown> = {
          ...serializeEntities(entities),
          deleted_table_ids: deletedServerIds,
          base_layout_version_id: baseLayoutVersionId,
        }
        if (layoutCanvasCols !== undefined) body.canvas_cols = layoutCanvasCols
        if (layoutCanvasRows !== undefined) body.canvas_rows = layoutCanvasRows
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
        const result = await saveDraft(body)
        setLoadedDraft(result.is_draft)
        setBaseLayoutVersionId(result.base_layout_version_id)
        setDraftSavedAt(result.updated_at)
        setDraftConflict(false)
      } catch (error) {
        if (error instanceof DraftSaveConflictError) {
          setDraftSavedAt(null)
          setDraftConflict(true)
          setShowSyncModal(true)
        }
      } finally {
        setDraftSaving(false)
      }
    }, 2000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [
    dirty,
    entities,
    deletedServerIds,
    layoutCanvasCols,
    layoutCanvasRows,
    pendingZones,
    restaurantId,
    baseLayoutVersionId,
  ])

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

  const syncLatestLayout = useCallback(
    async (discardDraft: boolean) => {
      setSyncing(true)
      try {
        if (discardDraft && loadedDraft) await deleteDraft()

        const res = await apiFetch("/api/editor/layouts/latest/")
        if (!res.ok) throw new Error("Failed to load latest layout.")
        const data: { layout_json?: LayoutPayload | null; layout_version_id?: string | null } =
          await res.json()
        setLoadedDraft(false)
        setBaseLayoutVersionId(data.layout_version_id ?? null)
        setDraftSavedAt(null)
        setDraftConflict(false)
        const lp = data.layout_json
        if (lp && typeof lp === "object") {
          const loaded = deserializeLayout(lp as LayoutPayload)
          loadEntities(loaded, serializeEntities(loaded))
        } else {
          loadEntities([], {})
        }
        await refreshZones()
        setShowSyncModal(false)
      } catch {
        toast.error(pageStrings.toasts.syncFailed)
      } finally {
        setSyncing(false)
      }
    },
    [loadedDraft, loadEntities, pageStrings.toasts.syncFailed, refreshZones, toast],
  )

  const requestSync = useCallback(() => {
    if (dirty || loadedDraft) {
      setShowSyncModal(true)
      return
    }
    void syncLatestLayout(false)
  }, [dirty, loadedDraft, syncLatestLayout])

  // Notify every editor about a newly published layout; the admin chooses when to sync.
  const handleOtherAdminPublished = useCallback(() => {
    if (publishingRef.current) return
    toast.action(pageStrings.toasts.layoutUpdated, strings.floor.toolbar.actions.sync, requestSync)
  }, [pageStrings.toasts.layoutUpdated, requestSync, strings.floor.toolbar.actions.sync, toast])

  const handleDiscard = useCallback(async () => {
    clearPendingZones()
    setDraftSavedAt(null)
    try {
      const [draftRes, freshZones] = await Promise.all([
        restaurantId ? deleteDraft().then(() => fetchDraft()) : Promise.resolve(null),
        restaurantId ? fetchZones(String(restaurantId)) : Promise.resolve([] as Zone[]),
      ])

      let layoutPayload: LayoutPayload | null = null

      if (draftRes) {
        setLoadedDraft(draftRes.is_draft)
        setBaseLayoutVersionId(draftRes.base_layout_version_id)
        const lp = draftRes.draft_json
        if (lp && typeof lp === "object") {
          layoutPayload = lp as LayoutPayload
        }
      }

      // Fallback to latest published if no draft fallback returned data
      if (!layoutPayload && restaurantId) {
        try {
          const res = await apiFetch("/api/editor/layouts/latest/")
          if (res.ok) {
            const data: { layout_json?: LayoutPayload | null; layout_version_id?: string | null } =
              await res.json()
            setLoadedDraft(false)
            setBaseLayoutVersionId(data.layout_version_id ?? null)
            if (data.layout_json && typeof data.layout_json === "object") {
              layoutPayload = data.layout_json as LayoutPayload
            }
          }
        } catch {
          // silent
        }
      }

      if (layoutPayload) {
        const loaded = deserializeLayout(layoutPayload)
        loadEntities(loaded, serializeEntities(loaded))
      } else {
        loadEntities([], {})
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
    onTableStatusChanged: (event) => {
      setOccupiedTableIds((prev) => {
        const next = new Set(prev)
        if (event.current_status === "occupied") next.add(event.table_id)
        else next.delete(event.table_id)
        return next
      })
    },
  })

  const currentTime = useCurrentTime()

  const handleAddZone = useCallback(
    (name: string) => {
      const clientId = crypto.randomUUID()
      createZone(clientId, name)
      setSelectedZoneId(clientId)
      setSelectedIds([])
      selectEntity(null)
    },
    [createZone, selectEntity],
  )

  // Block deleting a table that currently has guests seated, with an up-front
  // warning — otherwise the removal only fails later, at publish time.
  const handleDeleteEntity = useCallback(
    (id: string) => {
      const entity = entities.find((e) => e.id === id)
      const isTable = entity?.type === "table-square" || entity?.type === "table-round"
      if (isTable && entity?.serverId && occupiedTableIds.has(entity.serverId)) {
        toast.error(pageStrings.toasts.occupied)
        return
      }
      removeEntity(id)
      setSelectedIds((prev) => prev.filter((selected) => selected !== id))
    },
    [entities, occupiedTableIds, removeEntity, toast],
  )

  // Strict filter: only ever show the selected zone's entities. The Canvas is
  // gated behind `noZones`, so when `selectedZoneId` is momentarily null (load
  // race, or a zone deselected via ZoneHeader) we render nothing rather than
  // leaking other zones' grid -1 portals/thresholds into the padding area.
  const visibleEntities = useMemo(
    () => entities.filter((e) => e.zoneId === selectedZoneId),
    [entities, selectedZoneId],
  )

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
      setLoadedDraft(false)
      setBaseLayoutVersionId(result?.public_id ?? null)
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
      past,
      future,
    }
    publish(
      entities,
      deletedServerIds,
      layoutCanvasCols,
      layoutCanvasRows,
      pendingZones,
      baseLayoutVersionId,
    )
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
    baseLayoutVersionId,
    past,
    future,
  ])

  const deleteZoneTableCount = deleteZoneTarget
    ? entities.filter((e) => e.zoneId === deleteZoneTarget.public_id && e.type.startsWith("table-"))
        .length
    : 0

  const selectedEntity = visibleEntities.find((e) => e.id === selectedId) ?? null
  const effectiveSelectedIds = useMemo(() => {
    const visibleIds = new Set(visibleEntities.map((entity) => entity.id))
    const filtered = selectedIds.filter((id) => visibleIds.has(id))
    if (selectedId && visibleIds.has(selectedId) && !filtered.includes(selectedId)) {
      return [selectedId, ...filtered]
    }
    return filtered
  }, [selectedId, selectedIds, visibleEntities])

  const selectedEntities = useMemo(
    () =>
      effectiveSelectedIds
        .map((id) => visibleEntities.find((entity) => entity.id === id))
        .filter((entity): entity is EditorEntity => Boolean(entity)),
    [effectiveSelectedIds, visibleEntities],
  )

  const handleSelectionChange = useCallback(
    (ids: string[], primaryId: string | null) => {
      setSelectedIds(ids)
      selectEntity(primaryId)
    },
    [selectEntity],
  )

  const handleDuplicateEntity = useCallback(
    (id: string) => {
      const source = entities.find((item) => item.id === id)
      if (!source) return

      const duplicated = addEntity(source.type, source.x + 1, source.y + 1, {
        w: source.w,
        h: source.h,
        rotation: source.rotation ?? 0,
        zoneId: selectedZoneId ?? source.zoneId,
        targetZoneId: source.targetZoneId,
        capacity: source.capacity,
        sector: source.sector,
        tags: source.tags ? [...source.tags] : undefined,
        label: isTableEntity(source) ? getNextTableLabel(entities) : source.label,
      })
      if (duplicated) {
        handleSelectionChange([duplicated.id], duplicated.id)
      }
    },
    [addEntity, entities, handleSelectionChange, selectedZoneId],
  )

  const handleDeleteSelected = useCallback(
    (ids: string[]) => {
      const uniqueIds = Array.from(new Set(ids))
      const deletableIds: string[] = []
      for (const id of uniqueIds) {
        const entity = entities.find((item) => item.id === id)
        const isTable = entity?.type === "table-square" || entity?.type === "table-round"
        if (isTable && entity?.serverId && occupiedTableIds.has(entity.serverId)) {
          toast.error(pageStrings.toasts.occupied)
          continue
        }
        deletableIds.push(id)
      }
      if (deletableIds.length === 0) return
      const deletableSet = new Set(deletableIds)
      removeEntities(deletableIds)
      setSelectedIds((prev) => prev.filter((id) => !deletableSet.has(id)))
    },
    [entities, occupiedTableIds, removeEntities, toast],
  )

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
        if (entity) handleSelectionChange([entity.id], entity.id)
      }
    },
    [activeTool, addEntity, handleSelectionChange, selectedZoneId, setTool],
  )

  const handleSidebarToolSelect = useCallback(
    (tool: EditorEntity["type"]) => {
      setTool(tool)
      handleSelectionChange([], null)
    },
    [handleSelectionChange, setTool],
  )

  const handleZoneStyleChange = useCallback(
    (edge: string, style: "dashed" | "solid") => {
      if (!selectedZoneId) return
      const updated = { ...edgeStyles, [edge]: style }
      updateZoneMeta(selectedZoneId, { edge_styles: updated })
    },
    [selectedZoneId, edgeStyles, updateZoneMeta],
  )

  const handleCanvasSizeChange = useCallback(
    (cols: number, rows: number) => {
      if (!selectedZoneId) return
      updateZoneCanvasSize(selectedZoneId, cols, rows)
    },
    [selectedZoneId, updateZoneCanvasSize],
  )

  const handleRenameZone = useCallback(
    (zoneId: string, name: string) => {
      updateZoneMeta(zoneId, { name })
    },
    [updateZoneMeta],
  )

  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      setDeleting(true)
      deleteZoneMeta(zoneId)
      if (selectedZoneId === zoneId) {
        const remaining = allZones.filter((z) => z.public_id !== zoneId)
        setSelectedZoneId(remaining.length > 0 ? remaining[0].public_id : null)
      }
      setSelectedIds([])
      selectEntity(null)
      setDeleteZoneTarget(null)
      setDeleting(false)
    },
    [allZones, deleteZoneMeta, selectEntity, selectedZoneId],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      const withCommand = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (withCommand && key === "z") {
        event.preventDefault()
        setSelectedIds([])
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (withCommand && key === "y") {
        event.preventDefault()
        setSelectedIds([])
        redo()
        return
      }

      if (withCommand && key === "a") {
        event.preventDefault()
        const ids = visibleEntities.map((entity) => entity.id)
        if (ids.length === 0) {
          handleSelectionChange([], null)
          return
        }
        const primaryId = selectedId && ids.includes(selectedId) ? selectedId : ids[0]
        handleSelectionChange(ids, primaryId)
        return
      }

      if (key === "escape") {
        event.preventDefault()
        handleSelectionChange([], null)
        return
      }

      if (withCommand && key === "c") {
        const copied =
          selectedEntities.length > 0 ? selectedEntities : selectedEntity ? [selectedEntity] : []
        if (copied.length === 0) return
        const minX = Math.min(...copied.map((entity) => entity.x))
        const minY = Math.min(...copied.map((entity) => entity.y))
        copiedEntitiesRef.current = copied.map((entity) => ({
          ...entity,
          tags: entity.tags ? [...entity.tags] : undefined,
        }))
        copiedBoundsRef.current = { minX, minY }
        pasteStepRef.current = 0
        event.preventDefault()
        return
      }

      if (withCommand && key === "v") {
        const copiedEntities = copiedEntitiesRef.current
        if (copiedEntities.length === 0) return
        event.preventDefault()

        pasteStepRef.current += 1
        const offset = pasteStepRef.current
        const { minX, minY } = copiedBoundsRef.current
        const created: EditorEntity[] = []
        let nextEntities = [...entities]

        for (const copied of copiedEntities) {
          const relativeX = copied.x - minX
          const relativeY = copied.y - minY
          const pasteX = minX + relativeX + offset
          const pasteY = minY + relativeY + offset
          const copiedIntoZoneId = selectedZoneId ?? copied.zoneId
          const label = isTableEntity(copied) ? getNextTableLabel(nextEntities) : copied.label
          const next: EditorEntity = {
            id: crypto.randomUUID(),
            type: copied.type,
            x: pasteX,
            y: pasteY,
            w: copied.w,
            h: copied.h,
            label,
            capacity: copied.capacity,
            sector: copied.sector,
            tags: copied.tags ? [...copied.tags] : undefined,
            zoneId: copiedIntoZoneId,
            targetZoneId: copied.targetZoneId,
            rotation: copied.rotation ?? 0,
          }
          created.push(next)
          nextEntities = [...nextEntities, next]
        }

        const createdIds = addEntities(created).map((entity) => entity.id)
        if (createdIds.length > 0) {
          handleSelectionChange(createdIds, createdIds[0])
        }
        return
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const idsToDelete =
          selectedEntities.length > 0
            ? selectedEntities.map((entity) => entity.id)
            : selectedEntity
              ? [selectedEntity.id]
              : []
        if (idsToDelete.length === 0) return
        event.preventDefault()
        handleDeleteSelected(idsToDelete)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    addEntities,
    entities,
    handleDeleteSelected,
    handleSelectionChange,
    redo,
    selectedId,
    selectedEntities,
    selectedEntity,
    selectedZoneId,
    visibleEntities,
    undo,
  ])

  return (
    <div className="editor-page">
      <header className="editor-topbar" role="banner">
        <div className="editor-topbar__head">
          <div className="editor-topbar__identity">
            <div className="editor-topbar__brand">
              <span className="editor-topbar__logo" aria-hidden="true">
                <span className="editor-topbar__logo-dot" />
              </span>
              <div className="editor-topbar__brand-copy">
                <span className="editor-topbar__brand-title">{pageStrings.brandTitle}</span>
                <span className="editor-topbar__brand-subtitle">{pageStrings.brandSubtitle}</span>
              </div>
            </div>
            <h1 className="editor-topbar__title">{pageStrings.title}</h1>
            <p className="editor-topbar__subtitle">
              {selectedZone
                ? pageStrings.subtitleEditing(selectedZone.name)
                : pageStrings.subtitleEmpty}
            </p>
          </div>
          <div className="editor-topbar__meta">
            <span
              className={`editor-topbar__badge ${dirty ? "editor-topbar__badge--dirty" : "editor-topbar__badge--clean"}`}
            >
              {dirty ? pageStrings.status.dirty : pageStrings.status.clean}
            </span>
            <span
              className={`editor-topbar__live ${isConnected ? "editor-topbar__live--online" : ""}`}
              role="status"
              aria-label={
                isConnected ? pageStrings.live.ariaConnected : pageStrings.live.ariaDisconnected
              }
            >
              <span className="editor-topbar__live-dot" aria-hidden="true" />
              {isConnected ? pageStrings.live.connected : pageStrings.live.disconnected}
            </span>
            <div className="editor-topbar__time" aria-label={pageStrings.live.timeAria}>
              <span className="editor-topbar__clock">{currentTime}</span>
              <span className="editor-topbar__clock-label">{pageStrings.live.timeLabel}</span>
            </div>
          </div>
        </div>

        <div
          className="editor-topbar__metrics"
          role="group"
          aria-label={pageStrings.live.metricsAria}
        >
          <article className="editor-metric">
            <span className="editor-metric__label">{pageStrings.metrics.zones.label}</span>
            <span className="editor-metric__value">{allZones.length}</span>
            <span className="editor-metric__hint">{pageStrings.metrics.zones.hint}</span>
          </article>
          <article className="editor-metric">
            <span className="editor-metric__label">{pageStrings.metrics.tables.label}</span>
            <span className="editor-metric__value">{selectedZone ? zoneTables : "—"}</span>
            <span className="editor-metric__hint">
              {selectedZone
                ? pageStrings.metrics.tables.hintSelected
                : pageStrings.metrics.tables.hintEmpty}
            </span>
          </article>
          <article className="editor-metric">
            <span className="editor-metric__label">{pageStrings.metrics.portals.label}</span>
            <span className="editor-metric__value">{selectedZone ? zonePortals : "—"}</span>
            <span className="editor-metric__hint">
              {selectedZone
                ? pageStrings.metrics.portals.hintSelected
                : pageStrings.metrics.portals.hintEmpty}
            </span>
          </article>
          <article className="editor-metric">
            <span className="editor-metric__label">{pageStrings.metrics.grid.label}</span>
            <span className="editor-metric__value">{selectedZone ? canvasSizeLabel : "—"}</span>
            <span className="editor-metric__hint">{pageStrings.metrics.grid.hint}</span>
          </article>
        </div>
      </header>

      <section className="editor-page__panel">
        <Toolbar
          dirty={dirty}
          publishing={publishing}
          activeTool={activeTool}
          onToolSelect={setTool}
          onPublish={() => setShowPublishModal(true)}
          onSync={requestSync}
          onDiscard={handleDiscard}
          draftSaving={draftSaving}
          draftSavedAt={draftSavedAt}
          draftConflict={draftConflict}
          loadedDraft={loadedDraft}
        />
        <ZoneHeader
          zones={allZones}
          selectedZoneId={selectedZoneId}
          onZoneSelect={(zoneId) => {
            setSelectedZoneId(zoneId)
            handleSelectionChange([], null)
          }}
          onAddZone={handleAddZone}
          onRenameZone={handleRenameZone}
          onDeleteZone={(zoneId) => {
            const zone = allZones.find((z) => z.public_id === zoneId)
            if (zone) setDeleteZoneTarget(zone)
          }}
        />
        <div
          className={[
            "editor-page__body",
            isSidebarCollapsed ? "editor-page__body--sidebar-collapsed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {noZones ? (
            <div className="editor-page__empty">
              <p>{pageStrings.emptyState}</p>
            </div>
          ) : (
            <>
              <div className="editor-page__stage">
                <div className="editor-page__stage-toolbar">
                  <button
                    type="button"
                    className="editor-page__sidebar-toggle"
                    aria-expanded={!isSidebarCollapsed}
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  >
                    {isSidebarCollapsed
                      ? pageStrings.sidebarToggle.show
                      : pageStrings.sidebarToggle.hide}
                  </button>
                </div>
                <Canvas
                  entities={visibleEntities}
                  selectedId={selectedId}
                  selectedIds={effectiveSelectedIds}
                  activeTool={activeTool}
                  onEntityMove={(id, x, y) => moveEntity(id, x, y, selectedZoneId ?? undefined)}
                  onEntitiesMoveByDelta={(ids, dx, dy) =>
                    moveEntitiesByDelta(ids, dx, dy, selectedZoneId ?? undefined)
                  }
                  onSelectionChange={handleSelectionChange}
                  onCanvasClick={handleCanvasClick}
                  onEntityResize={(id, w, h) => updateEntity(id, { w, h })}
                  edgeStyles={edgeStyles}
                  canvasCols={canvasCols}
                  canvasRows={canvasRows}
                />
              </div>
              {!isSidebarCollapsed && (
                <PropertiesSidebar
                  entity={selectedEntity}
                  zoneEntities={zoneEntities}
                  onUpdate={updateEntity}
                  onMove={(id, x, y) => moveEntity(id, x, y, selectedZoneId ?? undefined)}
                  onDelete={handleDeleteEntity}
                  onDuplicate={handleDuplicateEntity}
                  onToolSelect={handleSidebarToolSelect}
                  zones={allZones}
                  selectedZone={selectedZone}
                  onZoneStyleChange={handleZoneStyleChange}
                  canvasCols={canvasCols}
                  canvasRows={canvasRows}
                  onCanvasSizeChange={handleCanvasSizeChange}
                  onShowQr={(publicId, label) => setQrTarget({ publicId, label })}
                />
              )}
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

      {showSyncModal && (
        <SyncLayoutConfirmModal
          onConfirm={() => void syncLatestLayout(true)}
          onClose={() => setShowSyncModal(false)}
          busy={syncing}
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

      {qrTarget && (
        <TableQrModal
          tablePublicId={qrTarget.publicId}
          tableLabel={qrTarget.label}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  )
}

export default FloorPlanEditorPage
