import { LuHeart, LuStore, LuWallet } from "react-icons/lu"
import type { HistoryEntry } from "../../types"
import { computeCabinetStats, formatMoney } from "../../utils"
import "./CabinetStats.css"

type CabinetStatsProps = {
  history: HistoryEntry[]
}

export function CabinetStats({ history }: CabinetStatsProps) {
  // No visits yet — nothing to summarize.
  if (history.length === 0) return null

  const stats = computeCabinetStats(history)

  return (
    <section className="cabinet-stats" aria-label="Your stats">
      <div className="cabinet-stat">
        <span className="cabinet-stat__icon">
          <LuStore aria-hidden="true" />
        </span>
        <div className="cabinet-stat__body">
          <span className="cabinet-stat__value">{stats.visits}</span>
          <span className="cabinet-stat__label">{stats.visits === 1 ? "Visit" : "Visits"}</span>
        </div>
      </div>

      <div className="cabinet-stat">
        <span className="cabinet-stat__icon">
          <LuWallet aria-hidden="true" />
        </span>
        <div className="cabinet-stat__body">
          <span className="cabinet-stat__value">
            {formatMoney(stats.totalSpent, stats.currency)}
          </span>
          <span className="cabinet-stat__label">Total spent</span>
        </div>
      </div>

      <div className="cabinet-stat">
        <span className="cabinet-stat__icon">
          <LuHeart aria-hidden="true" />
        </span>
        <div className="cabinet-stat__body">
          <span className="cabinet-stat__value cabinet-stat__value--text">
            {stats.favoriteRestaurant ?? "—"}
          </span>
          <span className="cabinet-stat__label">Favorite place</span>
        </div>
      </div>
    </section>
  )
}
