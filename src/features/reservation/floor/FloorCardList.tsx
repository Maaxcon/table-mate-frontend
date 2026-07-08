import { LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import { bookStrings } from "@/features/reservation/strings"
import { TableSeats } from "./TableSeats"
import type { TableView, Tone } from "./types"

// Mobile fallback for the spatial map: a filterable, sorted list of table cards
// (the map is too cramped on narrow screens).
export function FloorCardList({
  sortedTableViews,
  visibleTableViews,
  onlyFree,
  setOnlyFree,
  freeCount,
  selectedId,
  onSelect,
  statusFilter,
  guests,
}: {
  sortedTableViews: TableView[]
  visibleTableViews: TableView[]
  onlyFree: boolean
  setOnlyFree: (v: boolean) => void
  freeCount: number
  selectedId: string | null
  onSelect: (table: Table) => void
  statusFilter: Tone | null
  guests: number
}) {
  return (
    <>
      <div className="c-floor-plan__filters" role="group">
        <button
          type="button"
          className={`c-floor-plan__filter ${!onlyFree ? "c-floor-plan__filter--active" : ""}`}
          onClick={() => setOnlyFree(false)}
        >
          {bookStrings.floorPlan.filterAll}
          <span className="c-floor-plan__filter-count">{sortedTableViews.length}</span>
        </button>
        <button
          type="button"
          className={`c-floor-plan__filter ${onlyFree ? "c-floor-plan__filter--active" : ""}`}
          onClick={() => setOnlyFree(true)}
        >
          {bookStrings.floorPlan.filterFree}
          <span className="c-floor-plan__filter-count">{freeCount}</span>
        </button>
      </div>

      {visibleTableViews.length === 0 ? (
        <div className="c-floor-plan__empty">
          <p className="c-floor-plan__empty-text">{bookStrings.floorPlan.noFree}</p>
          {onlyFree && sortedTableViews.length > 0 && (
            <button
              type="button"
              className="c-floor-plan__empty-btn"
              onClick={() => setOnlyFree(false)}
            >
              {bookStrings.floorPlan.showAll}
              <span className="c-floor-plan__filter-count">{sortedTableViews.length}</span>
            </button>
          )}
        </div>
      ) : (
        <ul className="c-floor-plan__list">
          {visibleTableViews.map(({ table, tone, label, bookable, perfect }, i) => {
            const dimmed = Boolean(statusFilter && tone !== statusFilter)
            return (
              <li key={table.public_id}>
                <button
                  type="button"
                  className={[
                    "c-floor-plan__card",
                    `c-floor-plan__card--${tone}`,
                    selectedId === table.public_id ? "c-floor-plan__card--selected" : "",
                    perfect ? "c-floor-plan__card--perfect" : "",
                    dimmed ? "c-floor-plan__card--dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}
                  onClick={() => onSelect(table)}
                  // Dimmed = filtered out by the legend: not clickable or tabbable.
                  disabled={!bookable || dimmed}
                  aria-label={bookStrings.floorPlan.tableAria(
                    table.public_number,
                    table.capacity,
                    label,
                  )}
                >
                  {perfect && (
                    <span
                      className="c-floor-plan__card-perfect"
                      title={bookStrings.floorPlan.perfectFit(guests)}
                    >
                      ★ {guests}
                    </span>
                  )}
                  <span
                    className={`c-floor-plan__card-table c-floor-plan__table--${tone}`}
                    aria-hidden="true"
                  >
                    <TableSeats capacity={table.capacity} shape="square" size={60} />
                    <span className="c-floor-plan__surface c-floor-plan__card-surface">
                      <span className="c-floor-plan__card-table-num">{table.public_number}</span>
                    </span>
                  </span>

                  <span className="c-floor-plan__card-cap">
                    <LuUsers aria-hidden="true" />
                    {bookStrings.floorPlan.seats(table.capacity)}
                  </span>

                  {bookable ? (
                    <span className="c-floor-plan__card-cta">
                      <LuPlus aria-hidden="true" />
                      {bookStrings.floorPlan.choose}
                    </span>
                  ) : (
                    <span
                      className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tone} c-floor-plan__card-badge`}
                    >
                      {label}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
