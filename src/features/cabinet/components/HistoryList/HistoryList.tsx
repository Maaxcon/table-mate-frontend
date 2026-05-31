import { LuChevronRight, LuReceipt } from "react-icons/lu"
import type { HistoryEntry } from "../../types"
import { formatDateTime, formatMoney } from "../../utils"
import "./HistoryList.css"

type HistoryListProps = {
  history: HistoryEntry[]
  // Opening a receipt is a placeholder for the MVP.
  onOpenReceipt: (entry: HistoryEntry) => void
}

export function HistoryList({ history, onOpenReceipt }: HistoryListProps) {
  // Newest first.
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-history-title">
      <h2 className="cabinet-section__title" id="cabinet-history-title">
        History
      </h2>

      {sorted.length === 0 ? (
        <p className="cabinet-section__empty">No past visits yet.</p>
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
                      {formatDateTime(entry.date)} · {itemCount}{" "}
                      {itemCount === 1 ? "item" : "items"}
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
