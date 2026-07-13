import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { NotificationEvent } from "../types"
import "./NotificationStreamSidebar.css"

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function renderDescription(description: string) {
  const arrowIndex = description.lastIndexOf("→")
  if (arrowIndex === -1) return description
  const head = description.slice(0, arrowIndex)
  const tail = description.slice(arrowIndex)
  const state = tail.replace("→", "").trim().toLowerCase()
  const pending = state !== "ready"
  return (
    <>
      {head}
      <span
        className={`notification-stream__arrow ${pending ? "notification-stream__arrow--pending" : ""}`}
      >
        {tail}
      </span>
    </>
  )
}

interface NotificationStreamSidebarProps {
  onConnectionChange?: (connected: boolean) => void
  events: NotificationEvent[]
  isConnected: boolean
  markEventRead: (eventId: string) => void
  markAllRead: () => void
}

export function NotificationStreamSidebar({
  onConnectionChange,
  events,
  isConnected,
  markEventRead,
  markAllRead,
}: NotificationStreamSidebarProps) {
  const navigate = useNavigate()

  useEffect(() => {
    onConnectionChange?.(isConnected)
  }, [isConnected, onConnectionChange])

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const clientEvents = sortedEvents.filter((event) => event.stream === "client")
  const kitchenEvents = sortedEvents.filter((event) => event.stream === "kitchen")
  const totalUnread = sortedEvents.filter((event) => !event.read).length

  const handleEventClick = (event: NotificationEvent) => {
    markEventRead(event.id)
    if (event.stream === "kitchen") {
      navigate("/staff/orders")
    } else {
      navigate("/waiter-order")
    }
  }

  const renderEvent = (event: NotificationEvent) => (
    <button
      key={event.id}
      type="button"
      className={`notification-stream__event${event.read ? "" : " notification-stream__event--unread"}`}
      onClick={() => handleEventClick(event)}
    >
      <div className="notification-stream__event-top">
        <span className="notification-stream__event-title">{event.title}</span>
        <span className="notification-stream__event-meta">
          {!event.read && <span className="notification-stream__pill">NEW</span>}
          <span className="notification-stream__event-time">{formatTime(event.timestamp)}</span>
        </span>
      </div>
      <p className="notification-stream__event-desc">{renderDescription(event.description)}</p>
    </button>
  )

  const renderSection = (
    title: string,
    unread: NotificationEvent[],
    read: NotificationEvent[],
    emptyLabel: string,
  ) => (
    <section className="notification-stream__section">
      <div className="notification-stream__section-header">
        <span className="notification-stream__section-title">{title}</span>
        <span className="notification-stream__section-count">{unread.length}</span>
      </div>
      {unread.length === 0 && read.length === 0 && (
        <p className="notification-stream__empty">{emptyLabel}</p>
      )}
      {unread.length > 0 && (
        <>
          <p className="notification-stream__subheading">Unread</p>
          {unread.map(renderEvent)}
        </>
      )}
      {read.length > 0 && (
        <>
          <p className="notification-stream__subheading">Read</p>
          {read.map(renderEvent)}
        </>
      )}
    </section>
  )

  const clientUnread = clientEvents.filter((event) => !event.read)
  const clientRead = clientEvents.filter((event) => event.read)
  const kitchenUnread = kitchenEvents.filter((event) => !event.read)
  const kitchenRead = kitchenEvents.filter((event) => event.read)

  const showMarkAll = totalUnread > 0

  return (
    <aside className="notification-stream">
      <div className="notification-stream__header">
        <span className="notification-stream__title">NOTIFICATIONS</span>
        <div className="notification-stream__header-actions">
          <span
            className={`notification-stream__status ${isConnected ? "notification-stream__status--on" : ""}`}
            role="status"
            aria-label={isConnected ? "Connected" : "Disconnected"}
          />
          {showMarkAll && (
            <button type="button" className="notification-stream__read-all" onClick={markAllRead}>
              Mark all read ({totalUnread})
            </button>
          )}
        </div>
      </div>

      <div className="notification-stream__sections" aria-live="polite" aria-relevant="additions">
        {renderSection("CLIENT", clientUnread, clientRead, "No client events")}
        {renderSection("KITCHEN", kitchenUnread, kitchenRead, "No kitchen events")}
      </div>
    </aside>
  )
}
