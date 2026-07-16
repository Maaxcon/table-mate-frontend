import "./NotificationsPanel.css"
import type { NotificationEvent } from "@/features/notification-stream/types"
import { useAdminStrings } from "@/features/admin/strings"

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

/**
 * Renders an event description, highlighting a trailing "→ state" transition
 * in the accent color (e.g. "Table 4 — Caesar → ready").
 */
function renderDescription(description: string) {
  const arrowIndex = description.lastIndexOf("→")
  if (arrowIndex === -1) return description
  const head = description.slice(0, arrowIndex)
  const tail = description.slice(arrowIndex)
  const state = tail.replace("→", "").trim().toLowerCase()
  const stateClass = state === "ready" ? "" : "kanban__notif-arrow--pending"
  return (
    <>
      {head}
      <span className={`kanban__notif-arrow ${stateClass}`}>{tail}</span>
    </>
  )
}

interface NotificationsPanelProps {
  events: NotificationEvent[]
  isConnected: boolean
  markEventRead: (eventId: string) => void
  markAllRead: () => void
}

export function NotificationsPanel({
  events,
  isConnected,
  markEventRead,
  markAllRead,
}: NotificationsPanelProps) {
  const strings = useAdminStrings()
  const kitchenEvents = events.filter((event) => event.stream === "kitchen")
  const unreadEvents = kitchenEvents.filter((event) => !event.read)
  const readEvents = kitchenEvents.filter((event) => event.read)

  const handleEventClick = (event: NotificationEvent) => {
    markEventRead(event.id)
  }

  return (
    <div className="kanban__col kanban__notifs">
      <div className="kanban__col-header">
        <span className="kanban__col-title kanban__col-title--muted">
          {strings.kitchen.notifications.title}
        </span>
        <div className="kanban__notif-actions">
          <span
            className={`kanban__notif-status ${isConnected ? "kanban__notif-status--on" : ""}`}
            role="status"
            aria-label={isConnected ? strings.common.connected : strings.common.disconnected}
          />
          {unreadEvents.length > 0 && (
            <button type="button" className="kanban__notif-read-all" onClick={markAllRead}>
              {strings.kitchen.notifications.markAll}
            </button>
          )}
        </div>
      </div>
      <div
        className="kanban__col-body kanban__notifs-list"
        aria-live="polite"
        aria-relevant="additions"
      >
        {kitchenEvents.length === 0 && (
          <p className="kanban__notif-empty">{strings.kitchen.notifications.empty}</p>
        )}
        {unreadEvents.length > 0 && (
          <>
            <p className="kanban__notif-subheading">{strings.kitchen.notifications.unread}</p>
            {unreadEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className="kanban__notif kanban__notif--unread"
                onClick={() => handleEventClick(event)}
              >
                <div className="kanban__notif-top">
                  <span className="kanban__notif-title">{event.title}</span>
                  <span className="kanban__notif-meta">
                    <span className="kanban__notif-pill">{strings.kitchen.notifications.new}</span>
                    <span className="kanban__notif-time">
                      {formatTime(event.timestamp, strings.locale)}
                    </span>
                  </span>
                </div>
                <p className="kanban__notif-desc">{renderDescription(event.description)}</p>
              </button>
            ))}
          </>
        )}
        {readEvents.length > 0 && (
          <>
            <p className="kanban__notif-subheading">{strings.kitchen.notifications.read}</p>
            {readEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className="kanban__notif"
                onClick={() => handleEventClick(event)}
              >
                <div className="kanban__notif-top">
                  <span className="kanban__notif-title">{event.title}</span>
                  <span className="kanban__notif-time">
                    {formatTime(event.timestamp, strings.locale)}
                  </span>
                </div>
                <p className="kanban__notif-desc">{renderDescription(event.description)}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
