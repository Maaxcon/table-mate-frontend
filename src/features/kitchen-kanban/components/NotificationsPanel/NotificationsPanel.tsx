import "./NotificationsPanel.css"
import { useNotificationStream } from "@/features/notification-stream/hooks/useNotificationStream"
import type { NotificationEvent } from "@/features/notification-stream/types"

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

export function NotificationsPanel() {
  const { events, isConnected, markEventRead, markAllRead } = useNotificationStream()
  const kitchenEvents = events.filter((event) => event.stream === "kitchen")
  const unreadEvents = kitchenEvents.filter((event) => !event.read)
  const readEvents = kitchenEvents.filter((event) => event.read)

  const handleEventClick = (event: NotificationEvent) => {
    markEventRead(event.id)
  }

  return (
    <div className="kanban__col kanban__notifs">
      <div className="kanban__col-header">
        <span className="kanban__col-title kanban__col-title--muted">NOTIFICATIONS</span>
        <div className="kanban__notif-actions">
          <span
            className={`kanban__notif-status ${isConnected ? "kanban__notif-status--on" : ""}`}
            role="status"
            aria-label={isConnected ? "Connected" : "Disconnected"}
          />
          {unreadEvents.length > 0 && (
            <button type="button" className="kanban__notif-read-all" onClick={markAllRead}>
              Mark all read
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
          <p className="kanban__notif-empty">No kitchen notifications</p>
        )}
        {unreadEvents.length > 0 && (
          <>
            <p className="kanban__notif-subheading">Unread</p>
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
                    <span className="kanban__notif-pill">NEW</span>
                    <span className="kanban__notif-time">{formatTime(event.timestamp)}</span>
                  </span>
                </div>
                <p className="kanban__notif-desc">{renderDescription(event.description)}</p>
              </button>
            ))}
          </>
        )}
        {readEvents.length > 0 && (
          <>
            <p className="kanban__notif-subheading">Read</p>
            {readEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className="kanban__notif"
                onClick={() => handleEventClick(event)}
              >
                <div className="kanban__notif-top">
                  <span className="kanban__notif-title">{event.title}</span>
                  <span className="kanban__notif-time">{formatTime(event.timestamp)}</span>
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
