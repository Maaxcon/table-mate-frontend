import type { RefObject } from "react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import type { SchedulerReservation, SchedulerTable } from "./types"
import { isoToDateKey } from "./types"
import { TimelineHeader } from "./TimelineHeader"
import { TableRow } from "./TableRow"

interface DayPanelProps {
  date: string
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  hourStart: number
  hourEnd: number
  workingHourStart: number
  workingHourEnd: number
  conflictReservationId: string | null
  modifiedIds: Set<string>
  onResizeStart: (reservationId: string, edge: "start" | "end", e: React.MouseEvent) => void
  scrollRef?: RefObject<HTMLDivElement | null>
  showNav?: boolean
  onPrevDay?: () => void
  onNextDay?: () => void
}

export function DayPanel({
  date,
  tables,
  reservations,
  hourStart,
  hourEnd,
  workingHourStart,
  workingHourEnd,
  conflictReservationId,
  modifiedIds,
  onResizeStart,
  scrollRef,
  showNav,
  onPrevDay,
  onNextDay,
}: DayPanelProps) {
  const d = new Date(date + "T00:00:00")
  const dayLabel = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const dateReservations = reservations.filter((r) => isoToDateKey(r.start_at) === date)

  return (
    <div className="scheduler__day-panel">
      {showNav ? (
        <div className="scheduler__day-header">
          <button
            type="button"
            className="scheduler__day-header-nav"
            onClick={onPrevDay}
            aria-label="Previous day"
          >
            <LuChevronLeft aria-hidden="true" />
          </button>
          <span className="scheduler__day-header-label">{dayLabel}</span>
          <button
            type="button"
            className="scheduler__day-header-nav"
            onClick={onNextDay}
            aria-label="Next day"
          >
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="scheduler__day-panel-header">{dayLabel}</div>
      )}
      <div className="scheduler__day-panel-body" ref={scrollRef}>
        <TimelineHeader
          hourStart={hourStart}
          hourEnd={hourEnd}
          workingHourStart={workingHourStart}
          workingHourEnd={workingHourEnd}
        />
        {tables.map((table) => (
          <TableRow
            key={`${table.public_id}__${date}`}
            table={table}
            date={date}
            reservations={dateReservations.filter((r) => r.table === table.public_id)}
            hourStart={hourStart}
            hourEnd={hourEnd}
            workingHourStart={workingHourStart}
            workingHourEnd={workingHourEnd}
            conflictReservationId={conflictReservationId}
            modifiedIds={modifiedIds}
            onResizeStart={onResizeStart}
          />
        ))}
      </div>
    </div>
  )
}
