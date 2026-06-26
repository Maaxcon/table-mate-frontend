import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { SchedulerReservation } from "./types"

interface ReservationBlockProps {
  reservation: SchedulerReservation
  hourStart: number
  hourEnd: number
  isConflict: boolean
  isModified: boolean
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
}

export function ReservationBlock({
  reservation,
  hourStart,
  hourEnd,
  isConflict,
  isModified,
  onResizeStart,
}: ReservationBlockProps) {
  const start = new Date(reservation.start_at)
  const end = new Date(reservation.end_at)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const totalMinutes = (hourEnd - hourStart) * 60

  const left = ((startMinutes - hourStart * 60) / totalMinutes) * 100
  const width = ((endMinutes - startMinutes) / totalMinutes) * 100

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.public_id,
    data: {
      reservationId: reservation.public_id,
      durationMinutes: endMinutes - startMinutes,
    },
  })

  const style: React.CSSProperties = {
    left: `${left}%`,
    width: `${width}%`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  const classNames = [
    "scheduler__block",
    isConflict && "scheduler__block--conflict",
    isModified && "scheduler__block--modified",
  ]
    .filter(Boolean)
    .join(" ")

  const durationMin = endMinutes - startMinutes
  const hours = Math.floor(durationMin / 60)
  const mins = durationMin % 60
  const durationLabel = hours > 0 ? `${hours}h${mins > 0 ? `${mins}m` : ""}` : `${mins}m`

  return (
    <div ref={setNodeRef} className={classNames} style={style} {...attributes} {...listeners}>
      <button
        type="button"
        className="scheduler__block-resize-handle scheduler__block-resize-handle--left"
        aria-label="Resize start"
        onMouseDown={(e) => {
          e.stopPropagation()
          onResizeStart(reservation.public_id, "start", e)
        }}
      />
      <div className="scheduler__block-content">
        <span className="scheduler__block-name">{reservation.customer_name}</span>
        <span className="scheduler__block-meta">
          {reservation.guest_count}p &middot; {durationLabel}
        </span>
      </div>
      <button
        type="button"
        className="scheduler__block-resize-handle scheduler__block-resize-handle--right"
        aria-label="Resize end"
        onMouseDown={(e) => {
          e.stopPropagation()
          onResizeStart(reservation.public_id, "end", e)
        }}
      />
    </div>
  )
}
