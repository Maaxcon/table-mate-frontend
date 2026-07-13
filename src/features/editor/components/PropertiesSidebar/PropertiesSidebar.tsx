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

const METADATA_TAGS = ["Window Seat", "Quiet", "Wheelchair Accessible"]
const TABLE_CAPACITY_PRESETS = [2, 4, 6, 8, 10, 12]

const EDGE_LABELS: Record<string, string> = {
  top: "Top Edge",
  right: "Right Edge",
  bottom: "Bottom Edge",
  left: "Left Edge",
}

const ENTITY_COPY: Record<EditorEntity["type"], { title: string; icon: string; accent: string }> = {
  "table-square": { title: "Square Table", icon: "▦", accent: "table" },
  "table-round": { title: "Round Table", icon: "◯", accent: "table" },
  obstacle: { title: "Obstacle", icon: "▧", accent: "obstacle" },
  threshold: { title: "Threshold", icon: "⎯", accent: "threshold" },
  portal: { title: "Portal", icon: "⇄", accent: "portal" },
}

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
    if ((entity.type === "portal" || entity.type === "threshold") && !entity.label?.trim()) {
      warnings.push("Add a label so staff can identify this passage quickly.")
    }
    if (entity.type === "portal" && !entity.targetZoneId) {
      warnings.push("Portal has no target zone yet.")
    }
    if (isTableEntity(entity) && (entity.capacity ?? 0) < 1) {
      warnings.push("Table capacity should be at least 1.")
    }
    if (entity.type !== "portal" && entity.type !== "threshold" && (entity.x < 0 || entity.y < 0)) {
      warnings.push("Element is outside editable bounds.")
    }
    return warnings
  }, [entity])

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
          <h3 className="editor-sidebar__title">Inspector</h3>
          <span className="editor-sidebar__id">Select a zone</span>
        </div>
        <div className="editor-sidebar__body">
          <p className="editor-sidebar__empty">
            Pick a zone tab first, then select any element to edit all properties.
          </p>
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
              <h3 className="editor-sidebar__title">{selectedZone?.name ?? "Zone Inspector"}</h3>
              <span className="editor-sidebar__id">Canvas & zone parameters</span>
            </div>
          </div>
        </div>
        <div className="editor-sidebar__body">
          <section className="editor-sidebar__stats">
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">Tables</span>
              <span className="editor-sidebar__stat-value">{zoneTableCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">Seats</span>
              <span className="editor-sidebar__stat-value">{zoneSeatCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">Portals</span>
              <span className="editor-sidebar__stat-value">{zonePortalCount}</span>
            </article>
            <article className="editor-sidebar__stat">
              <span className="editor-sidebar__stat-label">Obstacles</span>
              <span className="editor-sidebar__stat-value">{zoneObstacleCount}</span>
            </article>
          </section>

          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Quick Add</summary>
            <div className="editor-sidebar__quick-add">
              {(Object.keys(ENTITY_COPY) as EditorEntity["type"][]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="editor-sidebar__quick-btn"
                  onClick={() => onToolSelect(type)}
                >
                  <span aria-hidden="true">{ENTITY_COPY[type].icon}</span>
                  <span>{ENTITY_COPY[type].title}</span>
                </button>
              ))}
            </div>
          </details>

          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Canvas Size</summary>
            <div className="editor-sidebar__field-grid">
              <label className="editor-sidebar__field" htmlFor="canvas-cols">
                <span className="editor-sidebar__label">Columns</span>
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
                <span className="editor-sidebar__label">Rows</span>
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
            <summary className="editor-sidebar__section-title">Border Styles</summary>
            <div className="editor-sidebar__field-list">
              {Object.entries(EDGE_LABELS).map(([key, label]) => (
                <label key={key} className="editor-sidebar__field editor-sidebar__field--inline">
                  <span className="editor-sidebar__label">{label}</span>
                  <select
                    className="editor-sidebar__input"
                    value={zoneEdgeStyles[key]}
                    onChange={(e) => onZoneStyleChange(key, e.target.value as "dashed" | "solid")}
                  >
                    <option value="dashed">Dashed</option>
                    <option value="solid">Solid</option>
                  </select>
                </label>
              ))}
            </div>
          </details>

          <details className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Keyboard Shortcuts</summary>
            <div className="editor-sidebar__shortcuts">
              <span>`Cmd/Ctrl + C` copy selected element(s)</span>
              <span>`Cmd/Ctrl + V` paste with offset</span>
              <span>`Delete` remove selected element(s)</span>
              <span>`Cmd/Ctrl + Z` undo last change</span>
            </div>
          </details>
        </div>
      </aside>
    )
  }

  const isTable = isTableEntity(entity)
  const copy = ENTITY_COPY[entity.type]

  return (
    <aside className="editor-sidebar">
      <div className={`editor-sidebar__header editor-sidebar__header--${copy.accent}`}>
        <div className="editor-sidebar__header-main">
          <span className="editor-sidebar__icon" aria-hidden="true">
            {copy.icon}
          </span>
          <div>
            <h3 className="editor-sidebar__title">{copy.title}</h3>
            <span className="editor-sidebar__id">ID: {entity.id.slice(-6)}</span>
          </div>
        </div>
        <span className="editor-sidebar__badge">
          {zones.find((zone) => zone.public_id === (entity.zoneId ?? ""))?.name ?? "No zone"}
        </span>
      </div>

      <div className="editor-sidebar__body">
        {entityWarnings.length > 0 && (
          <section className="editor-sidebar__notice">
            <span className="editor-sidebar__notice-title">Needs attention</span>
            {entityWarnings.map((warning) => (
              <p key={warning} className="editor-sidebar__notice-text">
                {warning}
              </p>
            ))}
          </section>
        )}

        <details open className="editor-sidebar__section">
          <summary className="editor-sidebar__section-title">Transform</summary>
          <div className="editor-sidebar__field-grid">
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">X</span>
              <input
                className="editor-sidebar__input"
                type="number"
                value={entity.x}
                onChange={(e) => handleNumericUpdate(entity.id, "x", e.target.value, -1, 500)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">Y</span>
              <input
                className="editor-sidebar__input"
                type="number"
                value={entity.y}
                onChange={(e) => handleNumericUpdate(entity.id, "y", e.target.value, -1, 500)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">Width</span>
              <input
                className="editor-sidebar__input"
                type="number"
                min={1}
                value={entity.w}
                onChange={(e) => handleNumericUpdate(entity.id, "w", e.target.value, 1, 50)}
              />
            </label>
            <label className="editor-sidebar__field">
              <span className="editor-sidebar__label">Height</span>
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
              <span className="editor-sidebar__label">Rotation</span>
              <input
                id="sidebar-rotation"
                className="editor-sidebar__input"
                type="number"
                step={1}
                value={entity.rotation ?? 0}
                onChange={(e) =>
                  handleNumericUpdate(entity.id, "rotation", e.target.value, -3600, 3600)
                }
                aria-label="Rotation in degrees"
              />
            </label>
            <button
              type="button"
              className="editor-sidebar__button editor-sidebar__button--soft"
              onClick={() => onUpdate(entity.id, { rotation: ((entity.rotation ?? 0) + 45) % 360 })}
            >
              Rotate +45°
            </button>
          </div>
        </details>

        <details open className="editor-sidebar__section">
          <summary className="editor-sidebar__section-title">Placement</summary>
          <div className="editor-sidebar__field">
            <label className="editor-sidebar__label" htmlFor="sidebar-zone">
              Zone
            </label>
            <select
              id="sidebar-zone"
              className="editor-sidebar__input"
              value={entity.zoneId ?? ""}
              onChange={(e) => onUpdate(entity.id, { zoneId: e.target.value || undefined })}
            >
              <option value="">-- None --</option>
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
              Center X
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--axis"
              onClick={() => onMove(entity.id, entity.x, Math.round((canvasRows - entity.h) / 2))}
            >
              Center Y
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x, entity.y - 1)}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x - 1, entity.y)}
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x + 1, entity.y)}
              aria-label="Move right"
            >
              →
            </button>
            <button
              type="button"
              className="editor-sidebar__quick-btn editor-sidebar__quick-btn--nudge"
              onClick={() => onMove(entity.id, entity.x, entity.y + 1)}
              aria-label="Move down"
            >
              ↓
            </button>
          </div>
        </details>

        {isTable && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Table Settings</summary>
            <div className="editor-sidebar__qr-card">
              <div>
                <span className="editor-sidebar__label">Table ID</span>
                <span className="editor-sidebar__value">
                  {entity.label || "Auto-assigned on publish"}
                </span>
              </div>
              {entity.serverId ? (
                <button
                  type="button"
                  className="editor-sidebar__qr-btn"
                  onClick={() => onShowQr(entity.serverId!, entity.label ?? "")}
                >
                  <LuQrCode aria-hidden="true" />
                  Show QR
                </button>
              ) : (
                <span className="editor-sidebar__hint">Publish to get a QR code</span>
              )}
            </div>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-label">
                Public label
              </label>
              <input
                id="sidebar-label"
                className="editor-sidebar__input"
                type="text"
                value={entity.label ?? ""}
                onChange={(e) => onUpdate(entity.id, { label: e.target.value })}
                placeholder="e.g. T12"
              />
            </div>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-capacity">
                Capacity
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
            <div className="editor-sidebar__pill-row" role="group" aria-label="Capacity presets">
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
              <legend className="editor-sidebar__label">Tags</legend>
              {METADATA_TAGS.map((tag) => {
                const key = tag.toLowerCase().replace(/\s+/g, "-")
                const checked = entity.tags?.includes(key) ?? false
                return (
                  <label key={key} className="editor-sidebar__checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const tags = entity.tags ?? []
                        const next = checked ? tags.filter((t) => t !== key) : [...tags, key]
                        onUpdate(entity.id, { tags: next })
                      }}
                    />
                    <span>{tag}</span>
                  </label>
                )
              })}
            </fieldset>
          </details>
        )}

        {(entity.type === "portal" || entity.type === "threshold") && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Passage Settings</summary>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-label-2">
                Label
              </label>
              <input
                id="sidebar-label-2"
                className="editor-sidebar__input"
                type="text"
                value={entity.label ?? ""}
                onChange={(e) => onUpdate(entity.id, { label: e.target.value })}
                placeholder="e.g. BAR, ENTRANCE"
              />
            </div>
          </details>
        )}

        {entity.type === "portal" && (
          <details open className="editor-sidebar__section">
            <summary className="editor-sidebar__section-title">Navigation Link</summary>
            <div className="editor-sidebar__field">
              <label className="editor-sidebar__label" htmlFor="sidebar-target">
                Target Zone
              </label>
              <select
                id="sidebar-target"
                className="editor-sidebar__input"
                value={entity.targetZoneId ?? ""}
                onChange={handleTargetZoneChange}
              >
                <option value="">-- Select zone --</option>
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
          Duplicate
        </button>
        <button
          type="button"
          className="editor-sidebar__button editor-sidebar__button--danger"
          onClick={() => onDelete(entity.id)}
        >
          Delete
        </button>
      </div>
    </aside>
  )
}
