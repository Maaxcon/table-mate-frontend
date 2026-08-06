import type { CSSProperties } from "react"
import { LuCalendarClock, LuCircleCheck } from "react-icons/lu"
import "./ActiveColumn.css"
import type { KanbanTicket } from "../../types"
import { elapsedMinutes, timerUrgencyClass } from "../../utils"
import { useAdminStrings } from "@/features/admin/strings"

interface ActiveColumnProps {
  tickets: KanbanTicket[]
  onToggleItem(ticketId: string, itemId: string): void
  onBump(ticketId: string): void
  canManage: boolean
}

export function ActiveColumn({ tickets, onToggleItem, onBump, canManage }: ActiveColumnProps) {
  const strings = useAdminStrings()
  return (
    <div className="kanban__col kanban__col--active">
      <div className="kanban__col-header">
        <span className="kanban__col-title">{strings.kitchen.active.title}</span>
        <span className="kanban__col-subtitle">{strings.kitchen.active.subtitle}</span>
      </div>
      <div className="kanban__col-body">
        {tickets.length === 0 && (
          <div className="kanban-card kanban-card--empty">{strings.kitchen.active.empty}</div>
        )}
        {tickets.map((ticket) => {
          const allReady = ticket.items.every((it) => it.status === "ready")
          const elapsed = elapsedMinutes(ticket.startedAt)
          return (
            <div key={ticket.id} className="kanban-card kanban-card--active">
              <div className="kanban-card__top">
                <div className="kanban-card__header">
                  <span className="kanban-card__id">
                    {ticket.label}
                    {ticket.isPreorder && (
                      <LuCalendarClock
                        className="kanban-card__preorder-badge"
                        aria-label={strings.kitchen.preorderBadgeAria}
                      />
                    )}
                  </span>
                  <span className={`kanban-card__timer ${timerUrgencyClass(elapsed)}`}>
                    {elapsed}m
                  </span>
                </div>
                <button
                  type="button"
                  className={`kanban-card__bump ${allReady ? "kanban-card__bump--done" : ""}`}
                  onClick={() => {
                    if (!canManage) return
                    onBump(ticket.id)
                  }}
                  disabled={!allReady || !canManage}
                  aria-label={strings.kitchen.active.completeAria}
                >
                  {allReady ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{strings.kitchen.active.bump}</span>
                  )}
                </button>
              </div>
              <div className="kanban-card__items">
                {ticket.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`kanban-card__item-block kanban-card__item-block--cat ${item.status === "ready" ? "kanban-card__item-block--ready" : ""}`}
                    style={{ "--item-cat-color": item.categoryColor } as CSSProperties}
                    onClick={() => {
                      if (!canManage) return
                      onToggleItem(ticket.id, item.id)
                    }}
                    disabled={!canManage}
                    aria-pressed={item.status === "ready"}
                    aria-disabled={!canManage}
                  >
                    <span className="kanban-card__item-name">
                      {item.quantity}X {item.name}
                      {item.modifiers ? (
                        <span className="kanban-card__modifier"> ({item.modifiers})</span>
                      ) : null}
                      {item.categoryName && (
                        <span className="kanban-card__item-cat-tag">{item.categoryName}</span>
                      )}
                    </span>
                    {item.status === "ready" && (
                      <LuCircleCheck className="kanban-card__item-check" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
              <div className="kanban-card__footer">
                <span>
                  {strings.kitchen.active.guestPrefix}: {ticket.guestCount}
                </span>
                <span>
                  {strings.kitchen.active.serverPrefix}: {ticket.serverName.toUpperCase()}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
