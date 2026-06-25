import { FaFacebook, FaTelegram } from "react-icons/fa"
import { LuArrowUpRight, LuClock, LuMapPin, LuPhone, LuWallet } from "react-icons/lu"
import type { PublicRestaurantSettings, WorkingHours } from "@/features/menu/types"
import { menuStrings } from "@/features/menu/strings"
import "./RestaurantInfoPanel.css"

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const DAY_LABELS = menuStrings.dayShort

const DAY_ORDER: Array<keyof WorkingHours> = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

// JS getDay() is Sunday-first (0=Sun); the schedule is Monday-first.
function todayKey(): keyof WorkingHours {
  return DAY_ORDER[(new Date().getDay() + 6) % 7]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// Whether the venue is open right now, based on today's slot (overnight aware).
function isOpenNow(hours: WorkingHours): boolean {
  const slot = hours[todayKey()]
  if (!slot) return false
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const open = toMinutes(slot.open)
  let close = toMinutes(slot.close)
  if (close <= open) close += 24 * 60 // closes after midnight
  return current >= open && current < close
}

type ScheduleRow = { label: string; time: string; isToday: boolean }

function groupConsecutiveDays(hours: WorkingHours): ScheduleRow[] {
  const today = todayKey()
  const rows: ScheduleRow[] = []
  let i = 0
  while (i < DAY_ORDER.length) {
    const day = DAY_ORDER[i]
    const slot = hours[day]
    if (!slot) {
      i++
      continue
    }
    let j = i + 1
    while (j < DAY_ORDER.length) {
      const next = hours[DAY_ORDER[j]]
      if (!next || next.open !== slot.open || next.close !== slot.close) break
      j++
    }
    const span = DAY_ORDER.slice(i, j)
    const startLabel = DAY_LABELS[day]
    const endLabel = j > i + 1 ? `–${DAY_LABELS[DAY_ORDER[j - 1]]}` : ""
    rows.push({
      label: `${startLabel}${endLabel}`,
      time: `${slot.open} – ${slot.close}`,
      isToday: span.includes(today),
    })
    i = j
  }
  return rows
}

type Props = {
  address: string | null
  phone: string | null
  settings: PublicRestaurantSettings | null
  telegramUrl?: string
  facebookUrl?: string
}

export function RestaurantInfoPanel({
  address,
  phone,
  settings,
  telegramUrl = "",
  facebookUrl = "",
}: Props) {
  const hours = settings?.working_hours
  const hasSchedule = Boolean(hours && Object.keys(hours).length > 0)
  const hasSocial = Boolean(telegramUrl || facebookUrl)
  const hasContent = address || phone || hasSchedule || hasSocial

  if (!hasContent) return null

  const scheduleRows = hours && hasSchedule ? groupConsecutiveDays(hours) : []
  const open = hours && hasSchedule ? isOpenNow(hours) : null

  return (
    <aside className="restaurant-info">
      <div className="restaurant-info__top">
        <h2 className="restaurant-info__heading">{menuStrings.info.heading}</h2>
        {open !== null && (
          <span
            className={`restaurant-info__status restaurant-info__status--${open ? "open" : "closed"}`}
          >
            <span className="restaurant-info__status-dot" aria-hidden="true" />
            {open ? menuStrings.info.openNow : menuStrings.info.closedNow}
          </span>
        )}
      </div>

      {(address || phone) && (
        <div className="restaurant-info__group">
          {address && (
            <a
              className="restaurant-info__row restaurant-info__row--map"
              href={mapsUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={menuStrings.info.viewOnMap}
            >
              <span className="restaurant-info__icon" aria-hidden="true">
                <LuMapPin size={16} />
              </span>
              <span className="restaurant-info__text">{address}</span>
              <LuArrowUpRight className="restaurant-info__map-arrow" size={14} aria-hidden="true" />
            </a>
          )}
          {phone && (
            <div className="restaurant-info__row">
              <span className="restaurant-info__icon" aria-hidden="true">
                <LuPhone size={16} />
              </span>
              <a className="restaurant-info__link" href={`tel:${phone.replace(/\s/g, "")}`}>
                {phone}
              </a>
            </div>
          )}
          {phone && (
            <a className="restaurant-info__call" href={`tel:${phone.replace(/\s/g, "")}`}>
              <LuPhone size={16} />
              {menuStrings.info.call}
            </a>
          )}
        </div>
      )}

      {scheduleRows.length > 0 && (
        <div className="restaurant-info__group">
          <div className="restaurant-info__group-head">
            <span className="restaurant-info__icon" aria-hidden="true">
              <LuClock size={16} />
            </span>
            <span className="restaurant-info__group-label">{menuStrings.info.hours}</span>
          </div>
          <ul className="restaurant-info__schedule">
            {scheduleRows.map(({ label, time, isToday }) => (
              <li
                key={label}
                className={`restaurant-info__schedule-row${isToday ? " restaurant-info__schedule-row--today" : ""}`}
              >
                <span className="restaurant-info__day">{label}</span>
                <span className="restaurant-info__time">{time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {settings?.currency && (
        <div className="restaurant-info__group">
          <div className="restaurant-info__row">
            <span className="restaurant-info__icon" aria-hidden="true">
              <LuWallet size={16} />
            </span>
            <span className="restaurant-info__text">
              {menuStrings.info.currency(settings.currency)}
            </span>
          </div>
        </div>
      )}

      {hasSocial && (
        <div className="restaurant-info__group">
          <span className="restaurant-info__group-label">{menuStrings.info.social}</span>
          <div className="restaurant-info__social">
            {telegramUrl && (
              <a
                className="restaurant-info__social-btn"
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
              >
                <FaTelegram size={16} />
                <span>Telegram</span>
              </a>
            )}
            {facebookUrl && (
              <a
                className="restaurant-info__social-btn"
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebook size={16} />
                <span>Facebook</span>
              </a>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
