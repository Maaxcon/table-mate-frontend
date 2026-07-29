import { useEffect, useMemo } from "react"
import { LuCalendarDays, LuClock, LuMinus, LuPlus, LuSparkles, LuUsers } from "react-icons/lu"
import type { WorkingHoursDay } from "./api"
import { useDateWindow } from "./hooks/useDateWindow"
import { useBookStrings } from "./strings"
import { DAY_NAMES, generateTimeSlots, localDateKey, localeFromLang } from "./utils"
import "./FloorSlotPicker.css"

interface FloorSlotPickerProps {
  workingHours: Record<string, WorkingHoursDay> | null
  date: Date
  time: string | null
  guests: number
  // Largest party the venue can seat — its biggest table's capacity. Caps the
  // stepper so the guest can't pick a count no table fits.
  maxGuests: number
  // Restaurant timezone, so the past-slot filter uses the venue's clock.
  timeZone: string | null
  onChange: (next: { date?: Date; time?: string | null; guests?: number }) => void
}

// Date + time + guests selector that sits above the floor plan so table statuses
// reflect the slot the guest actually wants, not "right now".
export function FloorSlotPicker({
  workingHours,
  date,
  time,
  guests,
  maxGuests,
  timeZone,
  onChange,
}: FloorSlotPickerProps) {
  const bookStrings = useBookStrings()
  // Keyed to the venue's calendar day (not the guest's device clock) so
  // "today" (and the 14-day window) matches the working day the backend
  // checks, and refreshes after midnight in the venue's zone if the page is
  // left open.
  const { today, dates } = useDateWindow(timeZone)

  const dayConfig = workingHours?.[DAY_NAMES[date.getDay()]]
  const timeSlots = useMemo(
    () => generateTimeSlots(date, dayConfig, timeZone),
    [date, dayConfig, timeZone],
  )

  // Keep a valid time selected: pick the first open slot whenever the current
  // one is gone (e.g. after switching to a different day).
  useEffect(() => {
    if (timeSlots.length === 0) {
      if (time !== null) onChange({ time: null })
    } else if (!time || !timeSlots.includes(time)) {
      onChange({ time: timeSlots[0] })
    }
  }, [timeSlots, time, onChange])

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  return (
    <div className="c-slot-picker">
      <div className="c-slot-picker__header">
        <span className="c-slot-picker__badge" aria-hidden="true">
          <LuSparkles />
        </span>
        <div className="c-slot-picker__intro">
          <h3 className="c-slot-picker__title">{bookStrings.floorPlan.slot.title}</h3>
          <p className="c-slot-picker__hint">{bookStrings.floorPlan.slot.hint}</p>
        </div>
      </div>

      <div className="c-slot-picker__field">
        <span className="c-slot-picker__label">
          <LuCalendarDays aria-hidden="true" />
          {bookStrings.floorPlan.slot.date}
        </span>
        <div className="c-slot-picker__chips">
          {dates.map((d) => {
            const closed = !workingHours?.[DAY_NAMES[d.getDay()]]
            const active = isSameDay(d, date)
            return (
              <button
                key={localDateKey(d)}
                type="button"
                className={[
                  "c-slot-picker__chip",
                  "c-slot-picker__chip--date",
                  active ? "c-slot-picker__chip--active" : "",
                  closed ? "c-slot-picker__chip--closed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={closed}
                onClick={() => onChange({ date: d, time: null })}
              >
                <span className="c-slot-picker__chip-dow">
                  {isSameDay(d, today)
                    ? bookStrings.floorPlan.slot.today
                    : d.toLocaleDateString(localeFromLang(), { weekday: "short" })}
                </span>
                <span className="c-slot-picker__chip-day">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="c-slot-picker__field">
        <span className="c-slot-picker__label">
          <LuClock aria-hidden="true" />
          {bookStrings.floorPlan.slot.time}
        </span>
        {timeSlots.length === 0 ? (
          <p className="c-slot-picker__empty">{bookStrings.floorPlan.slot.noTimes}</p>
        ) : (
          <div className="c-slot-picker__chips">
            {timeSlots.map((t) => (
              <button
                key={t}
                type="button"
                className={["c-slot-picker__chip", time === t ? "c-slot-picker__chip--active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onChange({ time: t })}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="c-slot-picker__field c-slot-picker__field--guests">
        <span className="c-slot-picker__label">
          <LuUsers aria-hidden="true" />
          {bookStrings.floorPlan.slot.guests}
        </span>
        <div className="c-slot-picker__guests">
          <button
            type="button"
            className="c-slot-picker__guest-btn"
            aria-label="−"
            onClick={() => onChange({ guests: Math.max(1, guests - 1) })}
            disabled={guests <= 1}
          >
            <LuMinus aria-hidden="true" />
          </button>
          <span className="c-slot-picker__guest-count">{guests}</span>
          <button
            type="button"
            className="c-slot-picker__guest-btn"
            aria-label="+"
            onClick={() => onChange({ guests: Math.min(maxGuests, guests + 1) })}
            disabled={guests >= maxGuests}
          >
            <LuPlus aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
