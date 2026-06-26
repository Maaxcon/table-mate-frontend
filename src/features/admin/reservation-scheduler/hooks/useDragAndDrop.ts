import { useCallback } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import type { SchedulerReservation, SchedulerTable } from "../types"
import { checkOverlap } from "./useOverlapCheck"
import type { PendingChange } from "../types"

interface UseDragAndDropOptions {
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  pendingChanges: PendingChange[]
  hourStart: number
  hourEnd: number
  slotMinutes: number
  onMove: (
    reservationId: string,
    newTableId: string,
    newTableNumber: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => void
  onConflict: (reservationId: string) => void
}

export function useDragAndDrop({
  tables,
  reservations,
  pendingChanges,
  hourStart,
  hourEnd,
  slotMinutes,
  onMove,
  onConflict,
}: UseDragAndDropOptions) {
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const activeData = active.data.current as
        | { reservationId: string; durationMinutes: number }
        | undefined
      const overData = over.data.current as { tableId: string; date: string } | undefined

      if (!activeData || !overData) return

      const { reservationId, durationMinutes } = activeData
      const { tableId, date } = overData

      const rect = over.rect
      if (!rect) return

      const pointerX = event.activatorEvent
        ? (event.activatorEvent as MouseEvent).clientX - rect.left
        : rect.width / 2

      const totalMinutes = (hourEnd - hourStart) * 60
      const minuteOffset =
        Math.round(((pointerX / rect.width) * totalMinutes) / slotMinutes) * slotMinutes
      const startMinute =
        hourStart * 60 + Math.max(0, Math.min(minuteOffset, totalMinutes - durationMinutes))
      const endMinute = startMinute + durationMinutes

      const startHH = String(Math.floor(startMinute / 60)).padStart(2, "0")
      const startMM = String(startMinute % 60).padStart(2, "0")
      const endHH = String(Math.floor(endMinute / 60)).padStart(2, "0")
      const endMM = String(endMinute % 60).padStart(2, "0")
      const startTime = `${startHH}:${startMM}`
      const endTime = `${endHH}:${endMM}`

      const proposed = {
        table_id: tableId,
        date,
        start_minutes: startMinute,
        end_minutes: endMinute,
      }

      if (checkOverlap(proposed, reservations, pendingChanges, reservationId)) {
        onConflict(reservationId)
        return
      }

      const table = tables.find((t) => t.public_id === tableId)
      onMove(reservationId, tableId, table?.public_number ?? "", date, startTime, endTime)
    },
    [tables, reservations, pendingChanges, hourStart, hourEnd, slotMinutes, onMove, onConflict],
  )

  return { handleDragEnd }
}
