import type { RefObject } from "react"
import type { SchedulerReservation, SchedulerTable } from "./types"
import { TimelineHeader } from "./TimelineHeader"
import { TableRow } from "./TableRow"

interface DayPanelProps {
  date: string
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  hourStart: number
  hourEnd: number
  conflictReservationId: string | null
  modifiedIds: Set<string>
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
  scrollRef?: RefObject<HTMLDivElement | null>
}

export function DayPanel({
  date,
  tables,
  reservations,
  hourStart,
  hourEnd,
  conflictReservationId,
  modifiedIds,
  onResizeStart,
  scrollRef,
}: DayPanelProps) {
  const d = new Date(date + "T00:00:00")
  const dayLabel = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const dateReservations = reservations.filter((r) => {
    const rd = new Date(r.start_at)
    const rdKey = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`
    return rdKey === date
  })

  return (
    <div className="scheduler__day-panel">
      <div className="scheduler__day-panel-header">{dayLabel}</div>
      <div className="scheduler__day-panel-body" ref={scrollRef}>
        <TimelineHeader hourStart={hourStart} hourEnd={hourEnd} />
        {tables.map((table) => (
          <TableRow
            key={`${table.public_id}__${date}`}
            table={table}
            date={date}
            reservations={dateReservations.filter((r) => r.table === table.public_id)}
            hourStart={hourStart}
            hourEnd={hourEnd}
            conflictReservationId={conflictReservationId}
            modifiedIds={modifiedIds}
            onResizeStart={onResizeStart}
          />
        ))}
      </div>
    </div>
  )
}
