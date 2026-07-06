import { useDroppable } from "@dnd-kit/core"
import { LuTrash2, LuUndo2 } from "react-icons/lu"

interface CancelZoneProps {
  activeDragId: string | null
  pendingCancellationIds: string[]
}

export function CancelZone({ activeDragId, pendingCancellationIds }: CancelZoneProps) {
  const isUndoMode = activeDragId ? pendingCancellationIds.includes(activeDragId) : false

  const { setNodeRef, isOver } = useDroppable({
    id: "cancel-zone",
    data: { zone: "cancel" },
    disabled: !activeDragId,
  })

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
      aria-label={isUndoMode ? "Undo cancellation" : "Cancel reservation"}
    >
      {isUndoMode ? <LuUndo2 aria-hidden="true" /> : <LuTrash2 aria-hidden="true" />}
      {activeDragId && <span>{isUndoMode ? "Undo" : "Cancel"}</span>}
    </div>
  )
}
