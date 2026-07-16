import { useDroppable } from "@dnd-kit/core"
import type { SchedulerReservation, SchedulerTable } from "./types"
import { ReservationBlock } from "./ReservationBlock"

interface TableRowProps {
  table: SchedulerTable
  date: string
  reservations: SchedulerReservation[]
  crossDayInfo: Record<string, "prev" | "next">
  hourStart: number
  hourEnd: number
  workingHourStart: number
  workingHourEnd: number
  conflictReservationId: string | null
  modifiedIds: Set<string>
  cancellingIds: Set<string>
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
  onResizeNudge?: (reservationId: string, edge: "start" | "end", direction: -1 | 1) => void
}

export function TableRow({
  table,
  date,
  reservations,
  crossDayInfo,
  hourStart,
  hourEnd,
  workingHourStart,
  workingHourEnd,
  conflictReservationId,
  modifiedIds,
  cancellingIds,
  onResizeStart,
  onResizeNudge,
}: TableRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${table.public_id}__${date}`,
    data: { tableId: table.public_id, date },
  })

  const classNames = ["scheduler__table-row", isOver && "scheduler__table-row--over"]
    .filter(Boolean)
    .join(" ")

  const hasExtended = hourStart < workingHourStart || hourEnd > workingHourEnd
  const totalHours = hourEnd - hourStart
  const extendedStartPct = ((workingHourStart - hourStart) / totalHours) * 100
  const extendedEndPct = ((hourEnd - workingHourEnd) / totalHours) * 100

  const cellsStyle: React.CSSProperties | undefined = hasExtended
    ? {
        backgroundImage:
          extendedStartPct > 0 && extendedEndPct > 0
            ? `linear-gradient(to right, var(--scheduler-extended-bg) 0%, var(--scheduler-extended-bg) ${extendedStartPct}%, transparent ${extendedStartPct}%, transparent ${100 - extendedEndPct}%, var(--scheduler-extended-bg) ${100 - extendedEndPct}%, var(--scheduler-extended-bg) 100%)`
            : extendedStartPct > 0
              ? `linear-gradient(to right, var(--scheduler-extended-bg) 0%, var(--scheduler-extended-bg) ${extendedStartPct}%, transparent ${extendedStartPct}%, transparent 100%)`
              : `linear-gradient(to right, transparent 0%, transparent ${100 - extendedEndPct}%, var(--scheduler-extended-bg) ${100 - extendedEndPct}%, var(--scheduler-extended-bg) 100%)`,
      }
    : undefined

  return (
    <div className={classNames}>
      <div className="scheduler__table-row-label">
        <span className="scheduler__table-row-name">{table.public_number}</span>
        <span className="scheduler__table-row-cap">{table.capacity}p</span>
      </div>
      <div ref={setNodeRef} className="scheduler__table-row-cells" style={cellsStyle}>
        {reservations.map((r) => (
          <ReservationBlock
            key={r.public_id}
            reservation={r}
            hourStart={hourStart}
            hourEnd={hourEnd}
            isConflict={r.public_id === conflictReservationId}
            isModified={modifiedIds.has(r.public_id)}
            isCancelling={cancellingIds.has(r.public_id)}
            crossDay={crossDayInfo[r.public_id]}
            workingHourStart={workingHourStart}
            workingHourEnd={workingHourEnd}
            onResizeStart={onResizeStart}
            onResizeNudge={onResizeNudge}
          />
        ))}
      </div>
    </div>
  )
}
