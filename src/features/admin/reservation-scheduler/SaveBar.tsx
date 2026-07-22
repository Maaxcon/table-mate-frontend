import { LuRotateCcw, LuSave } from "react-icons/lu"
import type { SchedulerStrings } from "@/features/admin/strings"

interface SaveBarProps {
  changeCount: number
  cancellationCount: number
  saving: boolean
  onSave: () => void
  onReset: () => void
  strings: SchedulerStrings["saveBar"]
}

export function SaveBar({
  changeCount,
  cancellationCount,
  saving,
  onSave,
  onReset,
  strings,
}: SaveBarProps) {
  const total = changeCount + cancellationCount
  if (total === 0) return null
  const summary = strings.summary(changeCount, cancellationCount)

  return (
    <div className="scheduler__save-bar">
      <span className="scheduler__save-bar-count">{summary}</span>
      <div className="scheduler__save-bar-actions">
        <button
          type="button"
          className="tm-button tm-button--secondary"
          onClick={onReset}
          disabled={saving}
        >
          <LuRotateCcw aria-hidden="true" />
          <span>{strings.reset}</span>
        </button>
        <button
          type="button"
          className="tm-button tm-button--primary"
          onClick={onSave}
          disabled={saving}
        >
          <LuSave aria-hidden="true" />
          <span>{saving ? strings.saving : strings.save}</span>
        </button>
      </div>
    </div>
  )
}
