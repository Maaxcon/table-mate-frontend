import { useCallback } from "react"
import type { Zone } from "@/features/reservation/api"
import type { EditorEntity } from "./types"
import "./PropertiesSidebar.css"

interface PropertiesSidebarProps {
  entity: EditorEntity | null
  onUpdate: (id: string, patch: Partial<EditorEntity>) => void
  onDelete: (id: string) => void
  zones: Zone[]
  edgeStyles: Record<string, "dashed" | "solid">
  onEdgeStyleChange: (edge: string, style: "dashed" | "solid") => void
}

const METADATA_TAGS = ["Window Seat", "Quiet", "Wheelchair Accessible"]

const EDGE_LABELS: Record<string, string> = {
  top: "Top Edge",
  right: "Right Edge",
  bottom: "Bottom Edge",
  left: "Left Edge",
}

export function PropertiesSidebar({
  entity,
  onUpdate,
  onDelete,
  zones,
  edgeStyles,
  onEdgeStyleChange,
}: PropertiesSidebarProps) {
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

  if (!entity) {
    return (
      <aside className="editor-sidebar">
        <p className="editor-sidebar__empty">Select an entity to edit properties</p>
      </aside>
    )
  }

  const isTable = entity.type.startsWith("table")

  return (
    <aside className="editor-sidebar">
      <div className="editor-sidebar__header">
        <h3 className="editor-sidebar__title">{entity.type.replace("-", " ").toUpperCase()}</h3>
        <span className="editor-sidebar__id">ID: {entity.id.slice(-6)}</span>
      </div>

      <div className="editor-sidebar__body">
        <div className="editor-sidebar__field">
          <span className="editor-sidebar__label">Position</span>
          <div className="editor-sidebar__row">
            <span className="editor-sidebar__value">X: {entity.x}</span>
            <span className="editor-sidebar__value">Y: {entity.y}</span>
          </div>
        </div>

        <div className="editor-sidebar__field">
          <span className="editor-sidebar__label">Size</span>
          <div className="editor-sidebar__row">
            <span className="editor-sidebar__value">
              {entity.w} × {entity.h}
            </span>
          </div>
        </div>

        {isTable && (
          <>
            <div className="editor-sidebar__field">
              <span className="editor-sidebar__label">Table ID</span>
              <span className="editor-sidebar__value">
                {entity.label || "Auto-assigned on publish"}
              </span>
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
                onChange={(e) => onUpdate(entity.id, { capacity: Number(e.target.value) })}
              />
            </div>

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
          </>
        )}

        {(entity.type === "portal" || entity.type === "threshold") && (
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
        )}

        {entity.type === "portal" && (
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
        )}

        {!isTable && (
          <div className="editor-sidebar__field">
            <label className="editor-sidebar__label" htmlFor="sidebar-zone-decor">
              Zone
            </label>
            <select
              id="sidebar-zone-decor"
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
        )}

        <fieldset className="editor-sidebar__field">
          <legend className="editor-sidebar__label">Border Styles</legend>
          {Object.entries(EDGE_LABELS).map(([key, label]) => (
            <div key={key} className="editor-sidebar__row" style={{ marginBottom: 6 }}>
              <label
                htmlFor={`edge-${key}`}
                style={{ fontSize: "0.8rem", minWidth: 70, display: "inline-block" }}
              >
                {label}
              </label>
              <select
                id={`edge-${key}`}
                className="editor-sidebar__input"
                value={edgeStyles[key]}
                onChange={(e) => onEdgeStyleChange(key, e.target.value as "dashed" | "solid")}
                style={{ width: "auto", flex: 1 }}
              >
                <option value="dashed">Dashed</option>
                <option value="solid">Solid</option>
              </select>
            </div>
          ))}
        </fieldset>

        <button
          type="button"
          className="editor-sidebar__delete"
          onClick={() => onDelete(entity.id)}
        >
          Delete
        </button>
      </div>
    </aside>
  )
}
