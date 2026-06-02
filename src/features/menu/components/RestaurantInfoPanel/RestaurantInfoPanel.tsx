import type { PublicRestaurantSettings, WorkingHours } from "../../api"
import "./RestaurantInfoPanel.css"

const DAY_LABELS: Record<keyof WorkingHours, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Нд",
}

const DAY_ORDER: Array<keyof WorkingHours> = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

type Props = {
  address: string | null
  phone: string | null
  settings: PublicRestaurantSettings | null
}

function groupConsecutiveDays(hours: WorkingHours): Array<{ label: string; time: string }> {
  const rows: Array<{ label: string; time: string }> = []
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
    const startLabel = DAY_LABELS[day]
    const endLabel = j > i + 1 ? `–${DAY_LABELS[DAY_ORDER[j - 1]]}` : ""
    rows.push({ label: `${startLabel}${endLabel}`, time: `${slot.open} – ${slot.close}` })
    i = j
  }
  return rows
}

export function RestaurantInfoPanel({ address, phone, settings }: Props) {
  const hasContent = address || phone || settings?.working_hours

  if (!hasContent) return null

  const scheduleRows =
    settings?.working_hours && Object.keys(settings.working_hours).length > 0
      ? groupConsecutiveDays(settings.working_hours)
      : []

  return (
    <aside className="restaurant-info">
      <h2 className="restaurant-info__heading">Про заклад</h2>

      {address && (
        <div className="restaurant-info__row">
          <span className="restaurant-info__icon" aria-hidden="true">
            📍
          </span>
          <span className="restaurant-info__text">{address}</span>
        </div>
      )}

      {phone && (
        <div className="restaurant-info__row">
          <span className="restaurant-info__icon" aria-hidden="true">
            📞
          </span>
          <a className="restaurant-info__link" href={`tel:${phone.replace(/\s/g, "")}`}>
            {phone}
          </a>
        </div>
      )}

      {scheduleRows.length > 0 && (
        <div className="restaurant-info__schedule">
          <div className="restaurant-info__row restaurant-info__row--schedule-title">
            <span className="restaurant-info__icon" aria-hidden="true">
              🕐
            </span>
            <span className="restaurant-info__text restaurant-info__text--label">
              Графік роботи
            </span>
          </div>
          <table className="restaurant-info__table">
            <tbody>
              {scheduleRows.map(({ label, time }) => (
                <tr key={label}>
                  <td className="restaurant-info__day">{label}</td>
                  <td className="restaurant-info__time">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {settings?.currency && (
        <div className="restaurant-info__row">
          <span className="restaurant-info__icon" aria-hidden="true">
            💳
          </span>
          <span className="restaurant-info__text">Валюта: {settings.currency}</span>
        </div>
      )}
    </aside>
  )
}
