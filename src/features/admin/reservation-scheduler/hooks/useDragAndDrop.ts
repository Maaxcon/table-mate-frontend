import { useCallback } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import type { SchedulerReservation, SchedulerTable } from "../types"
import {
  checkOperatingHours,
  checkOverlap,
  checkOrderingViolation,
  checkPastTimeViolation,
} from "./useOverlapCheck"
import type { WorkingHoursDay } from "./useOverlapCheck"
import type { PendingChange } from "../types"

interface UseDragAndDropOptions {
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  pendingChanges: PendingChange[]
  hourStart: number
  hourEnd: number
  slotMinutes: number
  restaurantTimezone?: string
  workingHours?: Record<string, WorkingHoursDay> | null
  onMove: (
    reservationId: string,
    newTableId: string,
    newTableNumber: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) => void
  onConflict: (reservationId: string, reason?: string) => void
}

export function useDragAndDrop({
  tables,
  reservations,
  pendingChanges,
  hourStart,
  hourEnd,
  slotMinutes,
  restaurantTimezone,
  workingHours,
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

      const { reservationId } = activeData

      const draggedReservation = reservations.find((r) => r.public_id === reservationId)
      if (draggedReservation && draggedReservation.status === "completed") return
      const { tableId, date } = overData

      let startTime: string
      let endTime: string
      let startMinute: number
      let endMinute: number

      if (draggedReservation && draggedReservation.status === "active") {
        if (draggedReservation.table === tableId) return

        const origStart = new Date(draggedReservation.start_at)
        const origEnd = new Date(draggedReservation.end_at)
        startMinute = origStart.getHours() * 60 + origStart.getMinutes()
        endMinute = origEnd.getHours() * 60 + origEnd.getMinutes()
        startTime = `${String(origStart.getHours()).padStart(2, "0")}:${String(origStart.getMinutes()).padStart(2, "0")}`
        endTime = `${String(origEnd.getHours()).padStart(2, "0")}:${String(origEnd.getMinutes()).padStart(2, "0")}`
      } else {
        const { durationMinutes } = activeData
        const rect = over.rect
        if (!rect) return

        const blockLeft = event.active.rect.current?.translated?.left
        if (blockLeft == null) return
        const pointerX = blockLeft - rect.left

        const totalMinutes = (hourEnd - hourStart) * 60
        const minuteOffset =
          Math.round(((pointerX / rect.width) * totalMinutes) / slotMinutes) * slotMinutes
        startMinute =
          hourStart * 60 + Math.max(0, Math.min(minuteOffset, totalMinutes - durationMinutes))
        endMinute = startMinute + durationMinutes

        const startHH = String(Math.floor(startMinute / 60)).padStart(2, "0")
        const startMM = String(startMinute % 60).padStart(2, "0")
        const endHH = String(Math.floor(endMinute / 60)).padStart(2, "0")
        const endMM = String(endMinute % 60).padStart(2, "0")
        startTime = `${startHH}:${startMM}`
        endTime = `${endHH}:${endMM}`
      }

      const proposed = {
        table_id: tableId,
        date,
        start_minutes: startMinute,
        end_minutes: endMinute,
      }

      if (checkOverlap(proposed, reservations, pendingChanges, reservationId)) {
        onConflict(reservationId, "Time slot overlaps with another reservation")
        return
      }

      const orderingReason = checkOrderingViolation(proposed, reservations, reservationId)
      if (orderingReason) {
        onConflict(reservationId, orderingReason)
        return
      }

      const pastReason = checkPastTimeViolation(
        proposed,
        draggedReservation?.status,
        restaurantTimezone,
      )
      if (pastReason) {
        onConflict(reservationId, pastReason)
        return
      }

      const hoursReason = checkOperatingHours(proposed, workingHours)
      if (hoursReason) {
        onConflict(reservationId, hoursReason)
        return
      }

      const table = tables.find((t) => t.public_id === tableId)
      onMove(reservationId, tableId, table?.public_number ?? "", date, startTime, endTime)
    },
    [
      tables,
      reservations,
      pendingChanges,
      hourStart,
      hourEnd,
      slotMinutes,
      restaurantTimezone,
      workingHours,
      onMove,
      onConflict,
    ],
  )

  return { handleDragEnd }
}
