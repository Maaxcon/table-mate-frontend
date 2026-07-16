import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { SchedulerStrings } from "@/features/admin/strings"
import type { SchedulerReservation } from "./types"

interface ReservationBlockProps {
  reservation: SchedulerReservation
  hourStart: number
  hourEnd: number
  isConflict: boolean
  isModified: boolean
  isCancelling: boolean
  crossDay?: "prev" | "next"
  workingHourStart: number
  workingHourEnd: number
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
  onResizeNudge?: (reservationId: string, edge: "start" | "end", direction: -1 | 1) => void
  strings: SchedulerStrings["block"]
}

export function ReservationBlock({
  reservation,
  hourStart,
  hourEnd,
  isConflict,
  isModified,
  isCancelling,
  crossDay,
  workingHourStart,
  onResizeStart,
  onResizeNudge,
  strings,
}: ReservationBlockProps) {
  const displayStart =
    reservation.status === "active" && reservation.opened_at
      ? new Date(reservation.opened_at)
      : new Date(reservation.start_at)
  const end = new Date(reservation.end_at)
  let startMinutes = displayStart.getHours() * 60 + displayStart.getMinutes()
  let endRaw = end.getHours() * 60 + end.getMinutes()

  if (crossDay === "next") {
    startMinutes += 24 * 60
    endRaw += 24 * 60
  } else if (crossDay === "prev") {
    startMinutes = 0
  }

  let endMinutes = endRaw < startMinutes ? endRaw + 24 * 60 : endRaw
  if (crossDay === "prev") {
    endMinutes = Math.min(endMinutes, workingHourStart * 60)
  } else if (crossDay === "next") {
    endMinutes = Math.min(endMinutes, hourEnd * 60)
  }
  const totalMinutes = (hourEnd - hourStart) * 60

  const left = ((startMinutes - hourStart * 60) / totalMinutes) * 100
  const width = ((endMinutes - startMinutes) / totalMinutes) * 100

  const dragDisabled = !!(reservation.status === "completed" || crossDay)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.public_id,
    data: {
      reservationId: reservation.public_id,
      durationMinutes: endMinutes - startMinutes,
    },
    disabled: dragDisabled,
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
    reservation.status === "pending" && "scheduler__block--pending",
    isConflict && "scheduler__block--conflict",
    isModified && "scheduler__block--modified",
    isCancelling && "scheduler__block--cancelling",
    reservation.status === "active" && "scheduler__block--active",
    reservation.status === "completed" && "scheduler__block--completed",
    crossDay && "scheduler__block--cross-day",
  ]
    .filter(Boolean)
    .join(" ")

  const durationMin = endMinutes - startMinutes
  const durationLabel = strings.duration(durationMin)
  const guestsLabel = strings.guests(reservation.guest_count)
  const blockMeta = strings.meta(guestsLabel, durationLabel)

  return (
    <div
      ref={setNodeRef}
      className={classNames}
      style={style}
      aria-label={strings.aria({
        name: reservation.customer_name,
        guests: guestsLabel,
        status: reservation.status,
        conflict: isConflict,
        modified: isModified,
        cancelling: isCancelling,
      })}
      aria-grabbed={isDragging}
      {...(crossDay ? {} : attributes)}
      {...listeners}
    >
      {reservation.status === "pending" && !crossDay && (
        <button
          type="button"
          data-resize-handle
          className="scheduler__block-resize-handle scheduler__block-resize-handle--left"
          aria-label={strings.resizeStart}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(reservation.public_id, "start", e)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault()
              e.stopPropagation()
              onResizeNudge?.(reservation.public_id, "start", e.key === "ArrowLeft" ? -1 : 1)
            }
          }}
        />
      )}
      <div className="scheduler__block-content">
        <span className="scheduler__block-name">{reservation.customer_name}</span>
        <span className="scheduler__block-meta">{blockMeta}</span>
        {isCancelling && (
          <span className="scheduler__block-cancel-badge">{strings.cancelBadge}</span>
        )}
      </div>
      {reservation.status !== "completed" && !crossDay && (
        <button
          type="button"
          data-resize-handle
          className="scheduler__block-resize-handle scheduler__block-resize-handle--right"
          aria-label={strings.resizeEnd}
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(reservation.public_id, "end", e)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault()
              e.stopPropagation()
              onResizeNudge?.(reservation.public_id, "end", e.key === "ArrowLeft" ? -1 : 1)
            }
          }}
        />
      )}
    </div>
  )
}
