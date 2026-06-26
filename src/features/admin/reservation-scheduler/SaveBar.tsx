import { LuRotateCcw, LuSave } from "react-icons/lu"

interface SaveBarProps {
  changeCount: number
  saving: boolean
  onSave: () => void
  onReset: () => void
}

export function SaveBar({ changeCount, saving, onSave, onReset }: SaveBarProps) {
  if (changeCount === 0) return null

  return (
    <div className="scheduler__save-bar">
      <span className="scheduler__save-bar-count">
        {changeCount} unsaved change{changeCount !== 1 ? "s" : ""}
      </span>
      <div className="scheduler__save-bar-actions">
        <button
          type="button"
          className="tm-button tm-button--secondary"
          onClick={onReset}
          disabled={saving}
        >
          <LuRotateCcw aria-hidden="true" />
          <span>Reset</span>
        </button>
        <button
          type="button"
          className="tm-button tm-button--primary"
          onClick={onSave}
          disabled={saving}
        >
          <LuSave aria-hidden="true" />
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>
    </div>
  )
}
