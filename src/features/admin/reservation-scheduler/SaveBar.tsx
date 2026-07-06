import { LuRotateCcw, LuSave } from "react-icons/lu"

interface SaveBarProps {
  changeCount: number
  cancellationCount: number
  saving: boolean
  onSave: () => void
  onReset: () => void
}

export function SaveBar({ changeCount, cancellationCount, saving, onSave, onReset }: SaveBarProps) {
  const total = changeCount + cancellationCount
  if (total === 0) return null

  return (
    <div className="scheduler__save-bar">
      <span className="scheduler__save-bar-count">
        {changeCount > 0 && `${changeCount} change${changeCount !== 1 ? "s" : ""}`}
        {changeCount > 0 && cancellationCount > 0 && ", "}
        {cancellationCount > 0 &&
          `${cancellationCount} cancellation${cancellationCount !== 1 ? "s" : ""}`}
        {" unsaved"}
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
