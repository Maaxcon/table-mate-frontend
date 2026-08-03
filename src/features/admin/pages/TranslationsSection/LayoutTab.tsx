import { useEffect, useMemo, useState } from "react"
import {
  DEFAULT_CANVAS_COLS,
  DEFAULT_CANVAS_ROWS,
  deserializeLayout,
  uprightContentStyle,
  type EditorEntity,
  type LayoutPayload,
} from "@/features/editor/types"
import { FloorPlanView } from "@/features/floorplan/FloorPlanView"
import * as layoutApi from "@/features/admin/api/layout"
import * as menuApi from "@/features/admin/api/menu"
import { useAdminStrings } from "@/features/admin/strings"
import LayoutEntityTranslationModal from "./LayoutEntityTranslationModal"
import type {
  AdminFloorZone,
  AdminLayoutEntity,
  AdminTableWithTranslations,
  LayoutEntityTranslation,
} from "@/features/admin/types"

const UNASSIGNED = "__unassigned__"

type LayoutTabProps = {
  locale: string
  supportedLanguages: string[]
}

function LayoutTab({ locale, supportedLanguages }: LayoutTabProps) {
  const strings = useAdminStrings()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutPayload | null>(null)
  const [zones, setZones] = useState<AdminFloorZone[]>([])
  const [entityTranslations, setEntityTranslations] = useState<LayoutEntityTranslation[]>([])
  const [tables, setTables] = useState<AdminTableWithTranslations[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<AdminLayoutEntity | null>(null)

  const displayLanguages = supportedLanguages.filter((l) => l !== locale)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      layoutApi.fetchLatestLayout(controller.signal),
      layoutApi.fetchZones(controller.signal),
      layoutApi.fetchEntityTranslations(controller.signal),
      menuApi.fetchTablesWithTranslations(controller.signal),
    ])
      .then(([layoutData, zonesData, translationsData, tablesData]) => {
        if (controller.signal.aborted) return
        setLayout(layoutData)
        setZones(zonesData)
        setEntityTranslations(translationsData)
        setTables(tablesData)
        setSelectedZoneId((prev) => prev ?? zonesData[0]?.public_id ?? null)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : strings.translations.layout.error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [strings.translations.layout.error])

  const entities = useMemo<AdminLayoutEntity[]>(() => {
    if (!layout) return []
    const tableTranslations = new Map<string, LayoutEntityTranslation[]>()
    for (const t of tables) {
      tableTranslations.set(
        t.public_id,
        t.translations.map((tt) => ({
          entity_id: t.public_id,
          language_code: tt.language_code,
          label: tt.public_number,
        })),
      )
    }
    const byEntityId = new Map<string, LayoutEntityTranslation[]>()
    for (const t of entityTranslations) {
      const list = byEntityId.get(t.entity_id) ?? []
      list.push(t)
      byEntityId.set(t.entity_id, list)
    }
    const result: AdminLayoutEntity[] = []
    for (const e of deserializeLayout(layout)) {
      if (e.type === "obstacle") continue
      const id = e.serverId ?? e.id
      if (!id) continue
      result.push({
        id,
        type: e.type,
        label: e.label ?? "",
        zoneId: e.zoneId,
        translations: e.type.startsWith("table")
          ? (tableTranslations.get(id) ?? [])
          : (byEntityId.get(id) ?? []),
      })
    }
    return result
  }, [layout, tables, entityTranslations])

  const entitiesById = useMemo(() => {
    const map = new Map<string, AdminLayoutEntity>()
    for (const e of entities) map.set(e.id, e)
    return map
  }, [entities])

  const unassignedEntities = useMemo(() => entities.filter((e) => !e.zoneId), [entities])

  const handleSaved = (entityId: string, translations: LayoutEntityTranslation[]) => {
    const entityType = entitiesById.get(entityId)?.type
    if (entityType?.startsWith("table")) {
      setTables((prev) =>
        prev.map((t) =>
          t.public_id === entityId
            ? {
                ...t,
                translations: translations.map((tr) => ({
                  language_code: tr.language_code,
                  public_number: tr.label,
                })),
              }
            : t,
        ),
      )
    } else {
      setEntityTranslations((prev) => [
        ...prev.filter((t) => t.entity_id !== entityId),
        ...translations,
      ])
    }
  }

  const handleRefresh = async () => {
    try {
      const [translationsData, tablesData] = await Promise.all([
        layoutApi.fetchEntityTranslations(),
        menuApi.fetchTablesWithTranslations(),
      ])
      setEntityTranslations(translationsData)
      setTables(tablesData)
    } catch {
      // keep current state on refresh failure
    }
  }

  const selectedZone = zones.find((z) => z.public_id === selectedZoneId)
  const canvasCols = selectedZone?.canvas_cols ?? DEFAULT_CANVAS_COLS
  const canvasRows = selectedZone?.canvas_rows ?? DEFAULT_CANVAS_ROWS
  const isUnassignedView = selectedZoneId === UNASSIGNED

  const entityTypeLabels: Record<AdminLayoutEntity["type"], string> = {
    "table-square": strings.floor.entities.tableSquare,
    "table-round": strings.floor.entities.tableRound,
    threshold: strings.floor.entities.threshold,
    portal: strings.floor.entities.portal,
  }

  const renderEntity = (
    entity: EditorEntity,
    geometry: {
      left: number
      top: number
      width: number
      height: number
      rotation: number
    },
  ) => {
    const style = {
      left: geometry.left,
      top: geometry.top,
      width: geometry.width,
      height: geometry.height,
      transform: entity.rotation ? `rotate(${entity.rotation}deg)` : undefined,
      borderRadius: entity.type === "table-round" ? "50%" : undefined,
    }
    if (entity.type === "obstacle") {
      return (
        <div
          key={entity.id}
          className="layout-translations__entity layout-translations__entity--obstacle"
          style={style}
        />
      )
    }
    const id = entity.serverId ?? entity.id
    const adminEntity = id ? entitiesById.get(id) : undefined
    if (!adminEntity) return null
    const label = adminEntity.label
    const translatedCount = adminEntity.translations.filter((t) =>
      displayLanguages.includes(t.language_code),
    ).length
    const total = displayLanguages.length
    const statusClass =
      total === 0 || translatedCount >= total
        ? "layout-translations__entity--complete"
        : translatedCount > 0
          ? "layout-translations__entity--partial"
          : "layout-translations__entity--missing"
    const editLabel = strings.translations.layout.edit(label || id)
    return (
      <button
        key={entity.id}
        type="button"
        className={`layout-translations__entity layout-translations__entity--${entity.type} ${statusClass}`}
        style={style}
        onClick={() => setSelectedEntity(adminEntity)}
        title={editLabel}
        aria-label={editLabel}
      >
        <span style={uprightContentStyle(entity.rotation)}>
          <span className="layout-translations__label">{label || "…"}</span>
          <span className="layout-translations__status">
            {translatedCount}/{total}
          </span>
        </span>
      </button>
    )
  }

  if (loading) {
    return <p className="admin-section__description">{strings.common.loading}</p>
  }

  if (error) {
    return <p className="admin-form__status admin-form__status--error">{error}</p>
  }

  return (
    <div className="layout-translations">
      {!layout && <p className="admin-section__description">{strings.translations.layout.empty}</p>}

      {layout && (
        <>
          <div
            className="layout-translations__zones"
            role="tablist"
            aria-label={strings.translations.layout.zones}
          >
            {zones.map((zone) => (
              <button
                key={zone.public_id}
                type="button"
                role="tab"
                aria-selected={selectedZoneId === zone.public_id}
                className={`layout-translations__zone${selectedZoneId === zone.public_id ? " layout-translations__zone--active" : ""}`}
                onClick={() => setSelectedZoneId(zone.public_id)}
              >
                {zone.name || zone.public_id}
              </button>
            ))}
            {unassignedEntities.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={isUnassignedView}
                className={`layout-translations__zone${isUnassignedView ? " layout-translations__zone--active" : ""}`}
                onClick={() => setSelectedZoneId(UNASSIGNED)}
              >
                {strings.translations.layout.unassigned}
              </button>
            )}
          </div>

          {isUnassignedView ? (
            <div className="layout-translations__unassigned">
              {unassignedEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className="layout-translations__unassigned-row"
                  onClick={() => setSelectedEntity(entity)}
                >
                  <span className="layout-translations__unassigned-name">
                    {entity.label || entity.id}
                  </span>
                  <span className="layout-translations__unassigned-type">
                    {entityTypeLabels[entity.type]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="layout-translations__canvas">
              <FloorPlanView
                payload={layout}
                selectedZoneId={isUnassignedView ? null : selectedZoneId}
                canvasCols={canvasCols}
                canvasRows={canvasRows}
                renderEntity={renderEntity}
                emptyMessage={strings.translations.layout.empty}
                enableZoom
              />
            </div>
          )}
        </>
      )}

      {selectedEntity && (
        <LayoutEntityTranslationModal
          entity={selectedEntity}
          primaryLanguage={locale}
          displayLanguages={displayLanguages}
          onClose={() => setSelectedEntity(null)}
          onSaved={handleSaved}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}

export default LayoutTab
