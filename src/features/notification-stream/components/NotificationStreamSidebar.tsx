import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useNotificationStream } from "../hooks/useNotificationStream"
import type { NotificationEvent } from "../types"
import "./NotificationStreamSidebar.css"

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  const clientEvents = events.filter((e) => e.stream === "client")
  const kitchenEvents = events.filter((e) => e.stream === "kitchen")

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
        <h2 className="notification-stream__title">NOTIFICATIONS</h2>
        <span
          className={`notification-stream__status ${isConnected ? "notification-stream__status--connected" : ""}`}
          role="status"
          aria-label={isConnected ? "Connected" : "Disconnected"}
        />
      </div>

      <div className="notification-stream__sections">
        <div className="notification-stream__section">
          <h3 className="notification-stream__section-title">CLIENT</h3>
          <div className="notification-stream__list">
            {clientEvents.length === 0 && (
              <p className="notification-stream__empty">No client events</p>
            )}
            {clientEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                className="notification-stream__event"
                onClick={() => handleEventClick(e)}
              >
                <div className="notification-stream__event-header">
                  <span className="notification-stream__event-type">{e.title}</span>
                  <span className="notification-stream__event-time">{formatTime(e.timestamp)}</span>
                </div>
                <p className="notification-stream__event-desc">{e.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="notification-stream__section">
          <h3 className="notification-stream__section-title">KITCHEN</h3>
          <div className="notification-stream__list">
            {kitchenEvents.length === 0 && (
              <p className="notification-stream__empty">No kitchen events</p>
            )}
            {kitchenEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                className="notification-stream__event"
                onClick={() => handleEventClick(e)}
              >
                <div className="notification-stream__event-header">
                  <span className="notification-stream__event-type">{e.title}</span>
                  <span className="notification-stream__event-time">{formatTime(e.timestamp)}</span>
                </div>
                <p className="notification-stream__event-desc">{e.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
