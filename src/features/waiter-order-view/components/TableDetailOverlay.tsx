import type { OverlayDetail } from "../data/mockData"
import { OrderItemRow } from "./OrderItemRow"
import "./TableDetailOverlay.css"

interface TableDetailOverlayProps {
  detail: OverlayDetail
  onClose: () => void
}

export function TableDetailOverlay({ detail, onClose }: TableDetailOverlayProps) {
  const guestSlots = [...new Set(detail.items.map((i) => i.guest_slot))].sort()

  return (
    <>
      <div
        className="overlay-backdrop"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose()
        }}
      />
      <div className="overlay">
        <div className="overlay__header">
          <div className="overlay__header-top">
            <h2 className="overlay__title">TABLE {detail.table_number}</h2>
            <button type="button" className="overlay__close" onClick={onClose} aria-label="Close">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="overlay__subtitle">
            Current Party: {detail.guest_name} &bull; {detail.guest_count} Guests &bull; Duration:{" "}
            {detail.duration}
          </p>
        </div>

        <div className="overlay__actions">
          <button type="button" className="overlay__action-btn">
            ADD ITEM
          </button>
          <button type="button" className="overlay__action-btn">
            MOVE TABLE
          </button>
          <button type="button" className="overlay__action-btn">
            CLOSE CHECK
          </button>
        </div>

        <div className="overlay__divider" />

        <div className="overlay__body">
          {guestSlots.map((slot) => {
            const slotItems = detail.items.filter((i) => i.guest_slot === slot)
            return (
              <div key={slot} className="overlay__slot">
                <h3 className="overlay__slot-title">GUEST {slot}</h3>
                {slotItems.map((item) => (
                  <OrderItemRow key={item.id} item={item} />
                ))}
              </div>
            )
          })}
        </div>

        <div className="overlay__divider" />

        <div className="overlay__footer">
          <div className="overlay__total-row">
            <span className="overlay__total-label">SUBTOTAL</span>
            <span className="overlay__total-value">&euro;{detail.subtotal}</span>
          </div>
          <div className="overlay__total-row">
            <span className="overlay__total-label">TAX</span>
            <span className="overlay__total-value">&euro;{detail.taxes}</span>
          </div>
          <div className="overlay__total-row overlay__total-row--final">
            <span className="overlay__total-label overlay__total-label--large">TOTAL</span>
            <span className="overlay__total-value overlay__total-value--large">
              &euro;{detail.total}
            </span>
          </div>
          <button type="button" className="overlay__cta">
            PROCESS PAYMENT
          </button>
        </div>
      </div>
    </>
  )
}
