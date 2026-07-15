import { LuChevronRight, LuReceipt } from "react-icons/lu"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { HistoryEntry } from "@/features/cabinet/types"
import { formatDateTime, formatMoney } from "@/features/cabinet/utils"
import "./HistoryList.css"

type HistoryListProps = {
  history: HistoryEntry[]
  error: string | null
  onOpenReceipt: (entry: HistoryEntry) => void
}

export function HistoryList({ history, error, onOpenReceipt }: HistoryListProps) {
  const strings = useCabinetStrings()
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-history-title">
      <h2 className="cabinet-section__title" id="cabinet-history-title">
        {strings.history.title}
      </h2>

      {error ? (
        <p className="cabinet-section__empty cabinet-section__empty--error">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="cabinet-section__empty">{strings.history.empty}</p>
      ) : (
        <ul className="cabinet-history">
          {sorted.map((entry) => {
            const itemCount = entry.items.reduce((n, i) => n + i.quantity, 0)
            return (
              <li key={entry.id}>
                <button type="button" className="history-card" onClick={() => onOpenReceipt(entry)}>
                  <LuReceipt className="history-card__icon" aria-hidden="true" />
                  <span className="history-card__body">
                    <span className="history-card__title">{entry.restaurantName}</span>
                    <span className="history-card__meta">
                      {formatDateTime(entry.date, strings.locale)} · {itemCount}{" "}
                      {itemCount === 1 ? strings.history.item : strings.history.items}
                    </span>
                  </span>
                  <span className="history-card__total">
                    {formatMoney(entry.total, entry.currency)}
                  </span>
                  <LuChevronRight className="history-card__chevron" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
