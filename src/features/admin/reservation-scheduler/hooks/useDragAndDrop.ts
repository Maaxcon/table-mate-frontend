import { useCallback } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import type { SchedulerReservation, SchedulerTable } from "../types"
import { checkOverlap, checkOrderingViolation, checkPastTimeViolation } from "./useOverlapCheck"
import type { PendingChange } from "../types"
import { addDays } from "../types"

interface UseDragAndDropOptions {
  tables: SchedulerTable[]
  reservations: SchedulerReservation[]
  pendingChanges: PendingChange[]
  pendingCancellationIds: string[]
  dayRanges: Record<string, { hourStart: number; hourEnd: number }>
  slotMinutes: number
  restaurantTimezone?: string
  onMove: (
    reservationId: string,
    newTableId: string,
    newTableNumber: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    crossMidnight?: boolean,
  ) => void
  onConflict: (reservationId: string, reason?: string) => void
  onCancel: (reservationId: string) => void
  onUncancel: (reservationId: string) => void
}

export function useDragAndDrop({
  tables,
  reservations,
  pendingChanges,
  pendingCancellationIds,
  dayRanges,
  slotMinutes,
  restaurantTimezone,
  onMove,
  onConflict,
  onCancel,
  onUncancel,
}: UseDragAndDropOptions) {
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const activeData = active.data.current as
        | { reservationId: string; durationMinutes: number }
        | undefined
      const overData = over.data.current as
        | { tableId: string; date: string }
        | { zone: "cancel" }
        | undefined

      if (!activeData || !overData) return

      const { reservationId } = activeData

      // Check if dropped on cancel/undo zone
      if ("zone" in overData && overData.zone === "cancel") {
        if (pendingCancellationIds.includes(reservationId)) {
          onUncancel(reservationId)
        } else {
          onCancel(reservationId)
        }
        return
      }

      // Otherwise treat as a normal move (table row drop)
      const draggedReservation = reservations.find((r) => r.public_id === reservationId)
      if (draggedReservation && draggedReservation.status === "completed") return
      const { tableId, date } = overData as { tableId: string; date: string }

      const range = dayRanges[date]
      if (!range) return
      const { hourStart, hourEnd } = range

      let startTime: string
      let endTime: string
      let startMinute: number
      let endMinute: number
      let targetDate: string
      let crossMidnight = false

      if (draggedReservation && draggedReservation.status === "active") {
        if (draggedReservation.table === tableId) return

        const origStart = new Date(draggedReservation.start_at)
        const origEnd = new Date(draggedReservation.end_at)
        startMinute = origStart.getHours() * 60 + origStart.getMinutes()
        endMinute = origEnd.getHours() * 60 + origEnd.getMinutes()
        startTime = `${String(origStart.getHours()).padStart(2, "0")}:${String(origStart.getMinutes()).padStart(2, "0")}`
        endTime = `${String(origEnd.getHours()).padStart(2, "0")}:${String(origEnd.getMinutes()).padStart(2, "0")}`
        targetDate = date
        crossMidnight = endMinute > 24 * 60
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
        const rawMinute = hourStart * 60 + minuteOffset
        startMinute = Math.max(hourStart * 60, Math.min(hourEnd * 60 - durationMinutes, rawMinute))
        endMinute = startMinute + durationMinutes

        targetDate = date
        crossMidnight = false
        if (startMinute >= 24 * 60) {
          targetDate = addDays(date, 1)
          startMinute -= 24 * 60
          endMinute -= 24 * 60
        } else {
          crossMidnight = endMinute > 24 * 60
        }

        const startHH = String(Math.floor(startMinute / 60)).padStart(2, "0")
        const startMM = String(startMinute % 60).padStart(2, "0")
        const endHH = String(Math.floor(endMinute / 60) % 24).padStart(2, "0")
        const endMM = String(endMinute % 60).padStart(2, "0")
        startTime = `${startHH}:${startMM}`
        endTime = `${endHH}:${endMM}`
      }

      const proposed = {
        table_id: tableId,
        date: targetDate,
        start_minutes: startMinute,
        end_minutes: endMinute > 24 * 60 ? endMinute - 24 * 60 : endMinute,
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

      const table = tables.find((t) => t.public_id === tableId)
      onMove(
        reservationId,
        tableId,
        table?.public_number ?? "",
        targetDate,
        startTime,
        endTime,
        crossMidnight,
      )
    },
    [
      tables,
      reservations,
      pendingChanges,
      pendingCancellationIds,
      dayRanges,
      slotMinutes,
      restaurantTimezone,
      onMove,
      onConflict,
      onCancel,
      onUncancel,
    ],
  )

  return { handleDragEnd }
}
