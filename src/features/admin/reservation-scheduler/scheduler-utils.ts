import type { WorkingHoursDay } from "@/features/reservation/api"
import type { SchedulerReservation } from "./types"
import { isoToDateKey } from "./types"

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export function getDayWorkingBounds(
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): { start: number; end: number } {
  if (!workingHours) return { start: 8, end: 23 }
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return { start: 8, end: 23 }

  const openMin = toMinutes(dayHours.open)
  const closeMin = toMinutes(dayHours.close)
  if (openMin == null || closeMin == null) return { start: 8, end: 23 }

  return {
    start: Math.floor(openMin / 60),
    end: Math.ceil((closeMin > openMin ? closeMin : closeMin + 24 * 60) / 60),
  }
}

export function getDayExtendedBounds(
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): { minHour: number; maxHour: number } | null {
  if (!workingHours) return null
  const d = new Date(date + "T00:00:00")
  const dayKey = DAY_KEYS[d.getDay()]
  const dayHours = workingHours[dayKey]
  if (!dayHours) return null

  const openMin = toMinutes(dayHours.open)
  const closeMin = toMinutes(dayHours.close)
  if (openMin == null || closeMin == null) return null

  const prevDayKey = DAY_KEYS[(d.getDay() + 6) % 7]
  const nextDayKey = DAY_KEYS[(d.getDay() + 1) % 7]
  const prevHours = workingHours[prevDayKey]
  const nextHours = workingHours[nextDayKey]

  const prevClose = prevHours ? toMinutes(prevHours.close) : null
  const prevOpen = prevHours ? toMinutes(prevHours.open) : null
  const nextOpen = nextHours ? toMinutes(nextHours.open) : null

  const thisOpen = openMin

  let minHour = 0
  if (prevClose != null && prevOpen != null) {
    if (prevClose < prevOpen) {
      minHour = 0
    } else {
      const prevCloseAdjusted = prevClose <= thisOpen ? prevClose : prevClose - 24 * 60
      minHour = Math.floor(prevCloseAdjusted / 60)
    }
  }

  let maxHour = 24
  if (nextOpen != null) {
    const nextOpenAdjusted = nextOpen + 24 * 60
    maxHour = Math.ceil(nextOpenAdjusted / 60)
  }

  return { minHour, maxHour }
}

export function isCrossDayReservation(
  resStartAt: string,
  resEndAt: string,
  date: string,
  workingHours: Record<string, WorkingHoursDay> | null,
): "prev" | "next" | null {
  const resDate = isoToDateKey(resStartAt)
  if (resDate === date) return null
  const diff = Math.round(
    (new Date(resDate + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime()) / 86400000,
  )
  if (Math.abs(diff) !== 1) return null
  if (diff === 1) {
    const bounds = getDayExtendedBounds(date, workingHours)
    if (!bounds) return null
    const resD = new Date(resStartAt)
    const resMinutes = 24 * 60 + resD.getHours() * 60 + resD.getMinutes()
    return resMinutes <= bounds.maxHour * 60 ? "next" : null
  }
  if (isoToDateKey(resEndAt) !== date) return null
  return "prev"
}

export function getReservationBlockMetrics(
  reservation: Pick<SchedulerReservation, "start_at" | "end_at">,
  hourEnd: number,
  hourStart: number,
  crossDay: "prev" | "next",
): { startMinutes: number; endMinutes: number; dragDurationMinutes: number; draggable: boolean } {
  const startD = new Date(reservation.start_at)
  const endD = new Date(reservation.end_at)
  const dragDurationMinutes = (endD.getTime() - startD.getTime()) / 60000

  if (crossDay === "next") {
    const startMinutes = 24 * 60 + startD.getHours() * 60 + startD.getMinutes()
    const rawEndMinutes = 24 * 60 + endD.getHours() * 60 + endD.getMinutes()
    return {
      startMinutes,
      endMinutes: Math.min(rawEndMinutes, hourEnd * 60),
      dragDurationMinutes,
      draggable: false,
    }
  }

  const endMinutes = endD.getHours() * 60 + endD.getMinutes()
  const dayStartMinutes = hourStart * 60
  const startMinutes = endMinutes > dayStartMinutes ? dayStartMinutes : 0
  return {
    startMinutes,
    endMinutes,
    dragDurationMinutes,
    draggable: endMinutes > dayStartMinutes,
  }
}
