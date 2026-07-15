import { useCallback, useMemo } from "react"
import { LuQrCode } from "react-icons/lu"
import type { Zone } from "@/features/reservation/api"
import type { EditorEntity } from "@/features/editor/types"
import {
  CANVAS_MIN_COLS,
  CANVAS_MIN_ROWS,
  CANVAS_MAX_COLS,
  CANVAS_MAX_ROWS,
} from "@/features/editor/types"
import "./PropertiesSidebar.css"
import { useAdminStrings } from "@/features/admin/strings"

interface PropertiesSidebarProps {
  entity: EditorEntity | null
  zoneEntities: EditorEntity[]
  onUpdate: (id: string, patch: Partial<EditorEntity>) => void
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToolSelect: (tool: EditorEntity["type"]) => void
  zones: Zone[]
  selectedZone: Zone | null
  onZoneStyleChange: (edge: string, style: "dashed" | "solid") => void
  canvasCols: number
  canvasRows: number
  onCanvasSizeChange: (cols: number, rows: number) => void
  onShowQr: (tablePublicId: string, tableLabel: string) => void
}

const TABLE_CAPACITY_PRESETS = [2, 4, 6, 8, 10, 12]

function clampInt(raw: string, min: number, max: number): number | null {
  const num = Number(raw)
  if (raw === "" || Number.isNaN(num)) return null
  return Math.max(min, Math.min(max, Math.round(num)))
}

function isTableEntity(entity: EditorEntity): boolean {
  return entity.type === "table-square" || entity.type === "table-round"
}

export function PropertiesSidebar({
  entity,
  zoneEntities,
  onUpdate,
  onMove,
  onDelete,
  onDuplicate,
  onToolSelect,
  zones,
  selectedZone,
  onZoneStyleChange,
  canvasCols,
  canvasRows,
  onCanvasSizeChange,
  onShowQr,
}: PropertiesSidebarProps) {
  const strings = useAdminStrings()
  const sidebarStrings = strings.floor.sidebar
  const zoneStrings = sidebarStrings.zone
  const entityStrings = sidebarStrings.entity
  const tableStrings = entityStrings.table
  const metadataTags = tableStrings.tags
  const entityCopyMap: Record<
    EditorEntity["type"],
    { title: string; icon: string; accent: string }
  > = {
    "table-square": { title: strings.floor.entities.tableSquare, icon: "▦", accent: "table" },
    "table-round": { title: strings.floor.entities.tableRound, icon: "◯", accent: "table" },
    obstacle: { title: strings.floor.entities.obstacle, icon: "▧", accent: "obstacle" },
    threshold: { title: strings.floor.entities.threshold, icon: "⎯", accent: "threshold" },
    portal: { title: strings.floor.entities.portal, icon: "⇄", accent: "portal" },
  }
  const zoneEdgeStyles = selectedZone?.edge_styles ?? {
    top: "dashed" as const,
    right: "dashed" as const,
    bottom: "dashed" as const,
    left: "dashed" as const,
  }

  const zoneTableCount = useMemo(
    () => zoneEntities.filter((item) => isTableEntity(item)).length,
    [zoneEntities],
  )
  const zoneSeatCount = useMemo(
    () =>
      zoneEntities.reduce(
        (sum, item) => (isTableEntity(item) ? sum + (item.capacity ?? 4) : sum),
        0,
      ),
    [zoneEntities],
  )
  const zonePortalCount = useMemo(
    () => zoneEntities.filter((item) => item.type === "portal").length,
    [zoneEntities],
  )
  const zoneObstacleCount = useMemo(
    () => zoneEntities.filter((item) => item.type === "obstacle").length,
    [zoneEntities],
  )

  const entityWarnings = useMemo(() => {
    if (!entity) return []
    const warnings: string[] = []
    const warningStrings = entityStrings.warnings
    if ((entity.type === "portal" || entity.type === "threshold") && !entity.label?.trim()) {
      warnings.push(warningStrings.missingLabel)
    }
    if (entity.type === "portal" && !entity.targetZoneId) {
      warnings.push(warningStrings.missingTarget)
    }
    if (isTableEntity(entity) && (entity.capacity ?? 0) < 1) {
      warnings.push(warningStrings.capacity)
    }
    if (entity.type !== "portal" && entity.type !== "threshold" && (entity.x < 0 || entity.y < 0)) {
      warnings.push(warningStrings.bounds)
    }
    return warnings
  }, [entity, entityStrings.warnings])

  const handleTargetZoneChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!entity) return
      const zoneId = e.target.value || undefined
      onUpdate(entity.id, { targetZoneId: zoneId })
      if (zoneId) {
        const zone = zones.find((z) => z.public_id === zoneId)
        if (zone && zone.name) {
          onUpdate(entity.id, { label: zone.name })
        }
      }
    },
    [entity, onUpdate, zones],
  )

  const handleNumericUpdate = useCallback(
    (
      id: string,
      field: "x" | "y" | "w" | "h" | "rotation" | "capacity",
      raw: string,
      min: number,
      max: number,
    ) => {
      const next = clampInt(raw, min, max)
      if (next === null) return
      if (field === "rotation") {
        const normalized = ((next % 360) + 360) % 360
        onUpdate(id, { rotation: normalized })
        return
      }
      if (field === "capacity") {
        onUpdate(id, { capacity: next })
        return
      }
      onUpdate(id, { [field]: next } as Partial<EditorEntity>)
    },
    [onUpdate],
  )

  if (!selectedZone && !entity) {
    return (
      <aside className="editor-sidebar">
        <div className="editor-sidebar__header">
          <h3 className="editor-sidebar__title">{sidebarStrings.empty.title}</h3>
          <span className="editor-sidebar__id">{sidebarStrings.empty.subtitle}</span>
        </div>
        <div className="editor-sidebar__body">
          <p className="editor-sidebar__empty">{sidebarStrings.empty.description}</p>
        </div>
      </aside>
    )
  }

  if (!entity) {
    return (
      <aside className="editor-sidebar">
        <div className="editor-sidebar__header editor-sidebar__header--zone">
          <div className="editor-sidebar__header-main">
            <span className="editor-sidebar__icon" aria-hidden="true">
              ◫
            </span>
            <div>
              <h3 className="editor-sidebar__title">
                {selectedZone?.name ?? zoneStrings.titleFallback}
              </h3>
              <span className="editor-sidebar__id">{zoneStrings.subtitle}</span>
            </div>
          </div>
        </div>
        <div className="editor-sidebar__body">
          <section className="editor-sidebar__stats">
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">{zoneStrings.stats.tables}</span>
              <span className="editor-sidebar__stat-value">{zoneTableCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">{zoneStrings.stats.seats}</span>
              <span className="editor-sidebar__stat-value">{zoneSeatCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">{zoneStrings.stats.portals}</span>
              <span className="editor-sidebar__stat-value">{zonePortalCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">{zoneStrings.stats.obstacles}</span>
              <span className="editor-sidebar__stat-value">{zoneObstacleCount}</span>
            </article>
          </section>

          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {zoneStrings.sections.quickAdd}
            </summary>
            <div className="editor-sidebar__quick-add">
              {(Object.keys(entityCopyMap) as EditorEntity["type"][]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="editor-sidebar__quick-btn"
                  onClick={() => onToolSelect(type)}
                >
                  <span aria-hidden="true">{entityCopyMap[type].icon}</span>
                  <span>{entityCopyMap[type].title}</span>
                </button>
              ))}
            </div>
          </details>

          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {zoneStrings.sections.canvas}
            </summary>
            <div className="editor-sidebar__field-grid">
              <label className="editor-sidebar__field" htmlFor="canvas-cols">
                <span className="editor-sidebar__label">{zoneStrings.fields.columns}</span>
                <input
                  id="canvas-cols"
                  type="number"
                  className="editor-sidebar__input"
                  min={CANVAS_MIN_COLS}
                  max={CANVAS_MAX_COLS}
                  value={canvasCols}
                  onChange={(e) => {
                    const value = clampInt(e.target.value, CANVAS_MIN_COLS, CANVAS_MAX_COLS)
                    if (value === null) return
                    onCanvasSizeChange(value, canvasRows)
                  }}
                />
              </label>
              <label className="editor-sidebar__field" htmlFor="canvas-rows">
                <span className="editor-sidebar__label">{zoneStrings.fields.rows}</span>
                <input
                  id="canvas-rows"
                  type="number"
                  className="editor-sidebar__input"
                  min={CANVAS_MIN_ROWS}
                  max={CANVAS_MAX_ROWS}
                  value={canvasRows}
                  onChange={(e) => {
                    const value = clampInt(e.target.value, CANVAS_MIN_ROWS, CANVAS_MAX_ROWS)
                    if (value === null) return
                    onCanvasSizeChange(canvasCols, value)
                  }}
                />
              </label>
            </div>
          </details>

          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {zoneStrings.sections.borders}
            </summary>
            <div className="editor-sidebar__field-list">
              {Object.entries(zoneStrings.borders.edges).map(([key, label]) => (
                <label key={key} className="editor-sidebar__field editor-sidebar__field--inline">
                  <span className="editor-sidebar__label">{label}</span>
                  <select
                    className="editor-sidebar__input"
                    value={zoneEdgeStyles[key]}
                    onChange={(e) => onZoneStyleChange(key, e.target.value as "dashed" | "solid")}
                  >
                    <option value="dashed">{zoneStrings.borders.styles.dashed}</option>
                    <option value="solid">{zoneStrings.borders.styles.solid}</option>
                  </select>
                </label>
              ))}
            </div>
          </details>

          <details className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {zoneStrings.sections.shortcuts}
            </summary>
            <div className="editor-sidebar__shortcuts">
              {zoneStrings.shortcuts.map((shortcut) => (
                <span key={shortcut}>{shortcut}</span>
              ))}
            </div>
          </details>
        </div>
      </aside>
    )
  }

  const isTable = isTableEntity(entity)
  const copy = entityCopyMap[entity.type]

  return (
    <aside className="editor-sidebar">
      <div className={`editor-sidebar__header editor-sidebar__header--${copy.accent}`}>
        <div className="editor-sidebar__header-main">
          <span className="editor-sidebar__icon" aria-hidden="true">
            {copy.icon}
          </span>
          <div>
            <h3 className="editor-sidebar__title">{copy.title}</h3>
            <span className="editor-sidebar__id">
              {entityStrings.idPrefix}: {entity.id.slice(-6)}
            </span>
          </div>
        </div>
        <span className="editor-sidebar__badge">
          {zones.find((zone) => zone.public_id === (entity.zoneId ?? ""))?.name ??
            entityStrings.noZone}
        </span>
      </div>

      <div className="editor-sidebar__body">
        {entityWarnings.length > 0 && (
          <section className="editor-sidebar__notice">
            <span className="editor-sidebar__notice-title">{entityStrings.noticeTitle}</span>
            {entityWarnings.map((warning) => (
              <p key={warning} className="editor-sidebar__notice-text">
                {warning}
              </p>
            ))}
          </section>
        )}

        <details open className="editor-sidebar__section">
          <summary className="editor-sidebar__section-title">
            {entityStrings.sections.transform}
          </summary>
          <div className="editor-sidebar__field-grid">
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">{entityStrings.fields.x}</span>
              <input
                className="editor-sidebar__input"
                type="number"
                value={entity.x}
                onChange={(e) => handleNumericUpdate(entity.id, "x", e.target.value, -1, 500)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">{entityStrings.fields.y}</span>
              <input
                className="editor-sidebar__input"
                type="number"
                value={entity.y}
                onChange={(e) => handleNumericUpdate(entity.id, "y", e.target.value, -1, 500)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">{entityStrings.fields.width}</span>
              <input
                className="editor-sidebar__input"
                type="number"
                min={1}
                value={entity.w}
                onChange={(e) => handleNumericUpdate(entity.id, "w", e.target.value, 1, 50)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">{entityStrings.fields.height}</span>
              <input
                className="editor-sidebar__input"
                type="number"
                min={1}
                value={entity.h}
                onChange={(e) => handleNumericUpdate(entity.id, "h", e.target.value, 1, 50)}
              />
            </label>
          </div>
          <div className="editor-sidebar__row editor-sidebar__row--single">
            <label className="editor-sidebar__field" htmlFor="sidebar-rotation">
              <span className="editor-sidebar__label">{entityStrings.fields.rotation}</span>
              <input
                id="sidebar-rotation"
                className="editor-sidebar__input"
                type="number"
                step={1}
                value={entity.rotation ?? 0}
                onChange={(e) =>
                  handleNumericUpdate(entity.id, "rotation", e.target.value, -3600, 3600)
                }
                aria-label={entityStrings.fields.rotationAria}
              />
            </label>
            <button
              type="button"
              className="editor-sidebar__button editor-sidebar__button--soft"
              onClick={() => onUpdate(entity.id, { rotation: ((entity.rotation ?? 0) + 45) % 360 })}
            >
              {entityStrings.fields.rotateStep}
            </button>
          </div>
        </details>

        <details open className="editor-sidebar__section">
          <summary className="editor-sidebar__section-title">
            {entityStrings.sections.placement}
          </summary>
          <div className="editor-sidebar__field">
            <label className="editor-sidebar__label" htmlFor="sidebar-zone">
              {entityStrings.fields.zone}
            </label>
            <select
              id="sidebar-zone"
              className="editor-sidebar__input"
              value={entity.zoneId ?? ""}
              onChange={(e) => onUpdate(entity.id, { zoneId: e.target.value || undefined })}
            >
              <option value="">{entityStrings.fields.noneOption}</option>
              {zones.map((z) => (
                <option key={z.public_id} value={z.public_id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-sidebar__arrange">
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--axis"
              onClick={() => onMove(entity.id, Math.round((canvasCols - entity.w) / 2), entity.y)}
            >
              {entityStrings.fields.centerX}
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--axis"
              onClick={() => onMove(entity.id, entity.x, Math.round((canvasRows - entity.h) / 2))}
            >
              {entityStrings.fields.centerY}
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x, entity.y - 1)}
              aria-label={entityStrings.fields.move.up}
            >
              ↑
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x - 1, entity.y)}
              aria-label={entityStrings.fields.move.left}
            >
              ←
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x + 1, entity.y)}
              aria-label={entityStrings.fields.move.right}
            >
              →
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x, entity.y + 1)}
              aria-label={entityStrings.fields.move.down}
            >
              ↓
            </button>
          </div>
        </details>

        {isTable && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {entityStrings.sections.table}
            </summary>
            <div className="editor-sidebar__qr-card">
              <div>
                <span className="editor-sidebar__label">{tableStrings.idLabel}</span>
                <span className="editor-sidebar__value">
                  {entity.label || tableStrings.unassigned}
                </span>
              </div>
              {entity.serverId ? (
                <button
                  type="button"
                  className="editor-sidebar__button editor-sidebar__button--qr"
                  onClick={() => onShowQr(entity.serverId!, entity.label ?? "")}
                >
                  <LuQrCode aria-hidden="true" />
                  {tableStrings.showQr}
                </button>
              ) : (
                <span className="editor-sidebar__hint">{tableStrings.qrHint}</span>
              )}
            </div>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-label">
                {tableStrings.publicLabel}
              </label>
              <input
                id="sidebar-label"
                className="editor-sidebar__input"
                type="text"
                value={entity.label ?? ""}
                onChange={(e) => onUpdate(entity.id, { label: e.target.value })}
                placeholder={tableStrings.labelPlaceholder}
              />
            </div>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-capacity">
                {tableStrings.capacity}
              </label>
              <input
                id="sidebar-capacity"
                className="editor-sidebar__input"
                type="number"
                min={1}
                max={20}
                value={entity.capacity ?? 4}
                onChange={(e) => {
                  handleNumericUpdate(entity.id, "capacity", e.target.value, 1, 20)
                }}
              />
            </div>
            <div
              className="editor-sidebar__pill-row"
              role="group"
              aria-label={tableStrings.presetsAria}
            >
              {TABLE_CAPACITY_PRESETS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={[
                    "editor-sidebar__pill",
                    (entity.capacity ?? 4) === size ? "editor-sidebar__pill--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onUpdate(entity.id, { capacity: size })}
                >
                  {size}
                </button>
              ))}
            </div>
            <fieldset className="editor-sidebar__field">
              <legend className="editor-sidebar__label">{tableStrings.tagsTitle}</legend>
              {metadataTags.map(({ value, label }) => {
                const checked = entity.tags?.includes(value) ?? false
                return (
                  <label key={value} className="editor-sidebar__checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const tags = entity.tags ?? []
                        const next = checked ? tags.filter((t) => t !== value) : [...tags, value]
                        onUpdate(entity.id, { tags: next })
                      }}
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </fieldset>
          </details>
        )}

        {(entity.type === "portal" || entity.type === "threshold") && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {entityStrings.sections.passage}
            </summary>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-label-2">
                {sidebarStrings.passage.label}
              </label>
              <input
                id="sidebar-label-2"
                className="editor-sidebar__input"
                type="text"
                value={entity.label ?? ""}
                onChange={(e) => onUpdate(entity.id, { label: e.target.value })}
                placeholder={sidebarStrings.passage.placeholder}
              />
            </div>
          </details>
        )}

        {entity.type === "portal" && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">
              {entityStrings.sections.navigation}
            </summary>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-target">
                {sidebarStrings.navigation.targetLabel}
              </label>
              <select
                id="sidebar-target"
                className="editor-sidebar__input"
                value={entity.targetZoneId ?? ""}
                onChange={handleTargetZoneChange}
              >
                <option value="">{sidebarStrings.navigation.placeholder}</option>
                {zones.map((z) => (
                  <option key={z.public_id} value={z.public_id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          </details>
        )}
      </div>

      <div className="editor-sidebar__footer">
        <button
          type="button"
          className="editor-sidebar__button editor-sidebar__button--primary"
          onClick={() => onDuplicate(entity.id)}
        >
          {entityStrings.actions.duplicate}
        </button>
        <button
          type="button"
          className="editor-sidebar__button editor-sidebar__button--danger"
          onClick={() => onDelete(entity.id)}
        >
          {entityStrings.actions.delete}
        </button>
      </div>
    </aside>
  )
}
