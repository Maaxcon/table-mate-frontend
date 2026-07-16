import type { RefObject } from "react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import type { SchedulerStrings } from "@/features/admin/strings"
import type { SchedulerReservation, SchedulerTable } from "./types"
import { isoToDateKey } from "./types"
import { TimelineHeader } from "./TimelineHeader"
import { TableRow } from "./TableRow"

interface DayPanelProps {
  date: string
  tables: SchedulerTable[]
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
  scrollRef?: RefObject<HTMLDivElement | null>
  showNav?: boolean
  onPrevDay?: () => void
  onNextDay?: () => void
  locale: string
  navLabels: SchedulerStrings["dayNav"]
  tableStrings: SchedulerStrings["table"]
  blockStrings: SchedulerStrings["block"]
}

export function DayPanel({
  date,
  tables,
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
  scrollRef,
  showNav,
  onPrevDay,
  onNextDay,
  locale,
  navLabels,
  tableStrings,
  blockStrings,
}: DayPanelProps) {
  const d = new Date(date + "T00:00:00")
  const dayLabel = d.toLocaleDateString(locale || "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const dateReservations = reservations.filter(
    (r) => isoToDateKey(r.start_at) === date || crossDayInfo[r.public_id] != null,
  )

  return (
    <div className="scheduler__day-panel">
      {showNav ? (
        <div className="scheduler__day-header">
          <button
            type="button"
            className="scheduler__day-header-nav"
            onClick={onPrevDay}
            aria-label={navLabels.prev}
          >
            <LuChevronLeft aria-hidden="true" />
          </button>
          <span className="scheduler__day-header-label">{dayLabel}</span>
          <button
            type="button"
            className="scheduler__day-header-nav"
            onClick={onNextDay}
            aria-label={navLabels.next}
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
            crossDayInfo={crossDayInfo}
            hourStart={hourStart}
            hourEnd={hourEnd}
            workingHourStart={workingHourStart}
            workingHourEnd={workingHourEnd}
            conflictReservationId={conflictReservationId}
            modifiedIds={modifiedIds}
            cancellingIds={cancellingIds}
            onResizeStart={onResizeStart}
            onResizeNudge={onResizeNudge}
            tableStrings={tableStrings}
            blockStrings={blockStrings}
          />
        ))}
      </div>
    </div>
  )
}
