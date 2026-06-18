import { useCallback, useEffect, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import { fetchZones } from "@/features/reservation/api"
import type { Zone } from "@/features/reservation/api"
import { apiFetch } from "@/api/client"
import { Toolbar } from "./Toolbar"
import { Canvas } from "./Canvas"
import { PropertiesSidebar } from "./PropertiesSidebar"
import { PublishConfirmModal } from "./PublishConfirmModal"
import { ZoneHeader } from "./ZoneHeader"
import { useEditorState } from "./hooks/useEditorState"
import { usePublish } from "./hooks/usePublish"
import { GRID, generateId, TABLE_PRESETS } from "./types"
import type { EditorEntity } from "./types"
import "./Toolbar.css"
import "./Canvas.css"
import "./PropertiesSidebar.css"
import "./FloorPlanSection.css"

function FloorPlanSection() {
  const {
    entities,
    selectedId,
    dirty,
    activeTool,
    addEntity,
    updateEntity,
    moveEntity,
    removeEntity,
    selectEntity,
    setTool,
    publishSuccess,
    loadEntities,
    dispatch,
  } = useEditorState()

  const restaurantId = useAppSelector((state) => state.auth.user?.restaurantId)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [edgeStyles, setEdgeStyles] = useState<Record<string, "dashed" | "solid">>({
    top: "dashed",
    right: "dashed",
    bottom: "dashed",
    left: "dashed",
  })
  const [publishWarnings, setPublishWarnings] = useState<
    Array<{ table_number: string; reservation_count: number; message: string }>
  >([])

  useEffect(() => {
    if (!restaurantId) return
    fetchZones(String(restaurantId))
      .then(setZones)
      .catch(() => setZones([]))
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    apiFetch(`/api/editor/tables/?restaurant=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((tables: Record<string, unknown>[]) => {
        const loaded = tables
          .filter((t) => t.active !== false)
          .map((t): EditorEntity => {
            const shape = (t.shape as string) ?? "square"
            const type = shape === "round" ? ("table-round" as const) : ("table-square" as const)
            const preset = TABLE_PRESETS[type]
            return {
              id: generateId(),
              serverId: t.public_id as string,
              type,
              x: ((t.position_x as number) ?? 0) / GRID,
              y: ((t.position_y as number) ?? 0) / GRID,
              w: preset?.w ?? 3,
              h: preset?.h ?? 3,
              label: (t.table_number as string) ?? undefined,
              capacity: t.capacity as number,
              zoneId: (t.zone as string) ?? undefined,
            }
          })
        loadEntities(loaded, {})
      })
      .catch(() => {})
  }, [restaurantId])

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

  const visibleEntities = selectedZoneId
    ? entities.filter((e) => e.zoneId === selectedZoneId || !e.type.startsWith("table"))
    : entities

  const { publish, publishing } = usePublish({
    onSuccess: (result?: Record<string, unknown>) => {
      publishSuccess()
      setShowPublishModal(false)
      if (result?.table_id_map) {
        const tableIdMap = result.table_id_map as Record<string, string>
        for (const [clientId, serverId] of Object.entries(tableIdMap)) {
          dispatch({ type: "UPDATE_ENTITY", id: clientId, patch: { serverId } })
        }
      }
      setPublishWarnings(
        (result?.warnings as Array<{
          table_number: string
          reservation_count: number
          message: string
        }>) ?? [],
      )
    },
  })

  const handlePublishConfirm = useCallback(() => {
    publish(entities)
  }, [publish, entities])

  const selectedEntity = entities.find((e) => e.id === selectedId) ?? null

  const handleCanvasClick = useCallback(
    (gridX: number, gridY: number) => {
      if (activeTool && activeTool !== "select" && activeTool !== "pan") {
        const extra =
          selectedZoneId && activeTool.startsWith("table") ? { zoneId: selectedZoneId } : undefined
        const entity = addEntity(activeTool as EditorEntity["type"], gridX, gridY, extra)
        setTool("select")
        if (entity) selectEntity(entity.id)
      }
    },
    [activeTool, addEntity, selectedZoneId, setTool, selectEntity],
  )

  const handleEdgeStyleChange = useCallback((edge: string, style: "dashed" | "solid") => {
    setEdgeStyles((prev) => ({ ...prev, [edge]: style }))
  }, [])

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
      />
      <div className="editor-page__body">
        <Canvas
          entities={visibleEntities}
          selectedId={selectedId}
          activeTool={activeTool}
          onEntityMove={moveEntity}
          onEntitySelect={selectEntity}
          onCanvasClick={handleCanvasClick}
          onEntityResize={(id, w, h) => updateEntity(id, { w, h })}
          edgeStyles={edgeStyles}
        />
        <PropertiesSidebar
          entity={selectedEntity}
          onUpdate={updateEntity}
          onDelete={removeEntity}
          zones={zones}
          edgeStyles={edgeStyles}
          onEdgeStyleChange={handleEdgeStyleChange}
        />
      </div>

      {showPublishModal && (
        <PublishConfirmModal
          onConfirm={handlePublishConfirm}
          onClose={() => setShowPublishModal(false)}
          busy={publishing}
          warnings={publishWarnings}
        />
      )}
    </div>
  )
}

export default FloorPlanSection
