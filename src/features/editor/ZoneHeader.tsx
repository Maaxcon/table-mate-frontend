import { useRef, useState } from "react"
import type { Zone } from "@/features/reservation/api"
import "./ZoneHeader.css"

interface ZoneHeaderProps {
  zones: Zone[]
  selectedZoneId: string | null
  onZoneSelect: (zoneId: string | null) => void
  onAddZone: (name: string) => Promise<void>
  onDeleteZone?: (zoneId: string) => void
  onRenameZone?: (zoneId: string, name: string) => Promise<void>
}

export function ZoneHeader({
  zones,
  selectedZoneId,
  onZoneSelect,
  onAddZone,
  onDeleteZone,
  onRenameZone,
}: ZoneHeaderProps) {
  const [adding, setAdding] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement | null>(null)

  const handleAdd = async () => {
    const name = inputValue.trim()
    if (!name) return
    setAdding(false)
    setInputValue("")
    await onAddZone(name)
  }

  const handleStartRename = (zone: Zone) => {
    setEditingZoneId(zone.public_id)
    setEditValue(zone.name)
    // Focus the input on next tick after render
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const handleFinishRename = async () => {
    const id = editingZoneId
    const name = editValue.trim()
    setEditingZoneId(null)
    setEditValue("")
    if (!id || !name || !onRenameZone) return
    await onRenameZone(id, name)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFinishRename()
    if (e.key === "Escape") {
      setEditingZoneId(null)
      setEditValue("")
    }
  }

  return (
    <div className="editor-zone-header">
      {zones.map((z) => (
        <div key={z.public_id} className="editor-zone-header__tab-wrapper">
          {editingZoneId === z.public_id ? (
            <input
              ref={editInputRef}
              className="editor-zone-header__rename-input"
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={handleRenameKeyDown}
            />
          ) : (
            <button
              type="button"
              className={[
                "editor-zone-header__tab",
                selectedZoneId === z.public_id ? "editor-zone-header__tab--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onZoneSelect(z.public_id)}
              onDoubleClick={() => onRenameZone && handleStartRename(z)}
            >
              {z.name.toUpperCase()}
              {onDeleteZone && (
                <span
                  className="editor-zone-header__delete"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteZone(z.public_id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      onDeleteZone(z.public_id)
                    }
                  }}
                  title="Delete zone"
                >
                  ×
                </span>
              )}
            </button>
          )}
        </div>
      ))}
      {adding ? (
        <div className="editor-zone-header__add-form">
          <input
            className="editor-zone-header__input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
              if (e.key === "Escape") {
                setAdding(false)
                setInputValue("")
              }
            }}
            placeholder="Zone name"
          />
          <button
            type="button"
            className="editor-zone-header__btn"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            ADD
          </button>
          <button
            type="button"
            className="editor-zone-header__btn editor-zone-header__btn--cancel"
            onClick={() => {
              setAdding(false)
              setInputValue("")
            }}
          >
            CANCEL
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="editor-zone-header__tab editor-zone-header__tab--add"
          onClick={() => setAdding(true)}
        >
          + ADD ZONE
        </button>
      )}
    </div>
  )
}
