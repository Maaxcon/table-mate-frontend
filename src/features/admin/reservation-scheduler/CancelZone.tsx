import { useDroppable } from "@dnd-kit/core"
import { LuTrash2, LuUndo2 } from "react-icons/lu"
import type { SchedulerStrings } from "@/features/admin/strings"

interface CancelZoneProps {
  activeDragId: string | null
  pendingCancellationIds: string[]
  onCancel?: (id: string) => void
  onUncancel?: (id: string) => void
  labels: SchedulerStrings["cancelZone"]
}

export function CancelZone({
  activeDragId,
  pendingCancellationIds,
  onCancel,
  onUncancel,
  labels,
}: CancelZoneProps) {
  const isUndoMode = activeDragId ? pendingCancellationIds.includes(activeDragId) : false

  const { setNodeRef, isOver } = useDroppable({
    id: "cancel-zone",
    data: { zone: "cancel" },
    disabled: !activeDragId,
  })

  const handleActivate = () => {
    if (!activeDragId) return
    if (isUndoMode) {
      onUncancel?.(activeDragId)
    } else {
      onCancel?.(activeDragId)
    }
  }

  const classNames = [
    "scheduler__cancel-zone",
    activeDragId && "scheduler__cancel-zone--active",
    isOver && !isUndoMode && "scheduler__cancel-zone--over",
    isOver && isUndoMode && "scheduler__cancel-zone--undo-over",
    !activeDragId && "scheduler__cancel-zone--idle",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      role="button"
      tabIndex={activeDragId ? 0 : -1}
      aria-label={isUndoMode ? labels.ariaUndo : labels.ariaCancel}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleActivate()
        }
      }}
    >
      {isUndoMode ? <LuUndo2 aria-hidden="true" /> : <LuTrash2 aria-hidden="true" />}
      {activeDragId && <span>{isUndoMode ? labels.labelUndo : labels.labelCancel}</span>}
    </div>
  )
}
