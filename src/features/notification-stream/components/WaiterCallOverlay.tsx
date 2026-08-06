import { LuBellRing, LuX } from "react-icons/lu"
import type { NotificationEvent } from "../types"
import "./WaiterCallOverlay.css"

interface WaiterCallOverlayProps {
  events: NotificationEvent[]
  markEventRead: (eventId: string) => void
}

export function WaiterCallOverlay({ events, markEventRead }: WaiterCallOverlayProps) {
  const pending = events
    .filter((event) => event.stream === "waiter" && !event.read)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  if (pending.length === 0) return null

  return (
    <div className="waiter-call-overlay" role="alert" aria-live="assertive">
      {pending.map((event) => (
        <div key={event.id} className="waiter-call-overlay__card">
          <span className="waiter-call-overlay__icon">
            <LuBellRing size={22} />
          </span>
          <div className="waiter-call-overlay__body">
            <span className="waiter-call-overlay__title">{event.title}</span>
            <span className="waiter-call-overlay__desc">{event.description}</span>
          </div>
          <button
            type="button"
            className="waiter-call-overlay__dismiss"
            onClick={() => markEventRead(event.id)}
            aria-label="Dismiss"
          >
            <LuX size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
