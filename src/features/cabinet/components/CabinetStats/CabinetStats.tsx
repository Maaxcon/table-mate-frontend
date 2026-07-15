import { LuHeart, LuStore, LuWallet } from "react-icons/lu"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { HistoryEntry } from "@/features/cabinet/types"
import { computeCabinetStats, formatMoney } from "@/features/cabinet/utils"
import "./CabinetStats.css"

type CabinetStatsProps = {
  history: HistoryEntry[]
}

export function CabinetStats({ history }: CabinetStatsProps) {
  const strings = useCabinetStrings()
  if (history.length === 0) return null

  const stats = computeCabinetStats(history)

  return (
    <section className="cabinet-stats" aria-label={strings.stats.aria}>
      <div className="cabinet-stat">
        <span className="cabinet-stat__icon">
          <LuStore aria-hidden="true" />
        </span>
        <div className="cabinet-stat__body">
          <span className="cabinet-stat__value">{stats.visits}</span>
          <span className="cabinet-stat__label">
            {stats.visits === 1 ? strings.stats.visit : strings.stats.visits}
          </span>
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
          <span className="cabinet-stat__label">{strings.stats.totalSpent}</span>
        </div>
      </div>

      <div className="cabinet-stat">
        <span className="cabinet-stat__icon">
          <LuHeart aria-hidden="true" />
        </span>
        <div className="cabinet-stat__body">
          <span className="cabinet-stat__value cabinet-stat__value--text">
            {stats.favoriteRestaurant ?? strings.stats.fallback}
          </span>
          <span className="cabinet-stat__label">{strings.stats.favoritePlace}</span>
        </div>
      </div>
    </section>
  )
}
