import { useNotificationStream } from "@/features/notification-stream/hooks/useNotificationStream"

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
  const { events, isConnected } = useNotificationStream()

  return (
    <div className="kanban__col kanban__notifs">
      <div className="kanban__col-header">
        <span className="kanban__col-title kanban__col-title--muted">NOTIFICATIONS</span>
        <span
          className={`kanban__notif-status ${isConnected ? "kanban__notif-status--on" : ""}`}
          role="status"
          aria-label={isConnected ? "Connected" : "Disconnected"}
        />
      </div>
      <div className="kanban__col-body kanban__notifs-list">
        {events.length === 0 && <p className="kanban__notif-empty">No notifications yet</p>}
        {events.map((event) => (
          <div key={event.id} className="kanban__notif">
            <div className="kanban__notif-top">
              <span className="kanban__notif-title">{event.title}</span>
              <span className="kanban__notif-time">{formatTime(event.timestamp)}</span>
            </div>
            <p className="kanban__notif-desc">{renderDescription(event.description)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
