import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useNotificationStream } from "../hooks/useNotificationStream"
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
}

export function NotificationStreamSidebar({ onConnectionChange }: NotificationStreamSidebarProps) {
  const { events, isConnected } = useNotificationStream()
  const navigate = useNavigate()

  useEffect(() => {
    onConnectionChange?.(isConnected)
  }, [isConnected, onConnectionChange])

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const clientEvents = sortedEvents.filter((event) => event.stream === "client")
  const kitchenEvents = sortedEvents.filter((event) => event.stream === "kitchen")

  const handleEventClick = (event: NotificationEvent) => {
    if (event.stream === "kitchen") {
      navigate("/staff/orders")
    } else {
      navigate("/waiter-order")
    }
  }

  return (
    <aside className="notification-stream">
      <div className="notification-stream__header">
        <span className="notification-stream__title">NOTIFICATIONS</span>
        <span
          className={`notification-stream__status ${isConnected ? "notification-stream__status--on" : ""}`}
          role="status"
          aria-label={isConnected ? "Connected" : "Disconnected"}
        />
      </div>

      <div className="notification-stream__sections" aria-live="polite" aria-relevant="additions">
        <section className="notification-stream__section">
          <div className="notification-stream__section-header">
            <span className="notification-stream__section-title">CLIENT</span>
            <span className="notification-stream__section-count">{clientEvents.length}</span>
          </div>
          {clientEvents.length === 0 && (
            <p className="notification-stream__empty">No client events</p>
          )}
          {clientEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className="notification-stream__event"
              onClick={() => handleEventClick(event)}
            >
              <div className="notification-stream__event-top">
                <span className="notification-stream__event-title">{event.title}</span>
                <span className="notification-stream__event-time">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              <p className="notification-stream__event-desc">
                {renderDescription(event.description)}
              </p>
            </button>
          ))}
        </section>

        <section className="notification-stream__section">
          <div className="notification-stream__section-header">
            <span className="notification-stream__section-title">KITCHEN</span>
            <span className="notification-stream__section-count">{kitchenEvents.length}</span>
          </div>
          {kitchenEvents.length === 0 && (
            <p className="notification-stream__empty">No kitchen events</p>
          )}
          {kitchenEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className="notification-stream__event"
              onClick={() => handleEventClick(event)}
            >
              <div className="notification-stream__event-top">
                <span className="notification-stream__event-title">{event.title}</span>
                <span className="notification-stream__event-time">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              <p className="notification-stream__event-desc">
                {renderDescription(event.description)}
              </p>
            </button>
          ))}
        </section>
      </div>
    </aside>
  )
}
