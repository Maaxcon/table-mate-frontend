import { useState } from "react"
import type { Zone } from "@/features/reservation/api"
import "./ZoneHeader.css"

interface ZoneHeaderProps {
  zones: Zone[]
  selectedZoneId: string | null
  onZoneSelect: (zoneId: string | null) => void
  onAddZone: (name: string) => Promise<void>
  onDeleteZone?: (zoneId: string) => void
}

export function ZoneHeader({
  zones,
  selectedZoneId,
  onZoneSelect,
  onAddZone,
  onDeleteZone,
}: ZoneHeaderProps) {
  const [adding, setAdding] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const handleAdd = async () => {
    const name = inputValue.trim()
    if (!name) return
    setAdding(false)
    setInputValue("")
    await onAddZone(name)
  }

  return (
    <div className="editor-zone-header">
      {zones.map((z) => (
        <button
          key={z.public_id}
          type="button"
          className={[
            "editor-zone-header__tab",
            selectedZoneId === z.public_id ? "editor-zone-header__tab--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onZoneSelect(z.public_id)}
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
