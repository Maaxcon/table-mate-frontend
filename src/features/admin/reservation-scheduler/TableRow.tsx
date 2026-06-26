import { useDroppable } from "@dnd-kit/core"
import type { SchedulerReservation, SchedulerTable } from "./types"
import { ReservationBlock } from "./ReservationBlock"

interface TableRowProps {
  table: SchedulerTable
  date: string
  reservations: SchedulerReservation[]
  hourStart: number
  hourEnd: number
  conflictReservationId: string | null
  modifiedIds: Set<string>
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
}

export function TableRow({
  table,
  date,
  reservations,
  hourStart,
  hourEnd,
  conflictReservationId,
  modifiedIds,
  onResizeStart,
}: TableRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${table.public_id}__${date}`,
    data: { tableId: table.public_id, date },
  })

  const classNames = ["scheduler__table-row", isOver && "scheduler__table-row--over"]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={classNames}>
      <div className="scheduler__table-row-label">
        <span className="scheduler__table-row-name">{table.public_number}</span>
        <span className="scheduler__table-row-cap">{table.capacity}p</span>
      </div>
      <div ref={setNodeRef} className="scheduler__table-row-cells">
        {reservations.map((r) => (
          <ReservationBlock
            key={r.public_id}
            reservation={r}
            hourStart={hourStart}
            hourEnd={hourEnd}
            isConflict={r.public_id === conflictReservationId}
            isModified={modifiedIds.has(r.public_id)}
            onResizeStart={onResizeStart}
          />
        ))}
      </div>
    </div>
  )
}
