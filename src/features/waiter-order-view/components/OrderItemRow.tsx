import { StatusChip } from "@/components/StatusChip/StatusChip"
import type { OverlayOrderItem } from "../data/waiterTypes"
import "./OrderItemRow.css"

interface OrderItemRowProps {
  item: OverlayOrderItem
  onVoid?: (itemId: string) => void
}

const REASON_LABELS: Record<string, string> = {
  mispick: "Mispick",
  guest_changed_mind: "Guest changed mind",
  quality_issue: "Quality issue",
  out_of_stock: "Out of stock",
}

export function OrderItemRow({ item, onVoid }: OrderItemRowProps) {
  const isVoided = item.status === "voided"
  const voidReasonLabel =
    item.void_reason != null ? (REASON_LABELS[item.void_reason] ?? item.void_reason) : null

  return (
    <div className={`order-item-row ${isVoided ? "order-item-row--voided" : ""}`}>
      <div className="order-item-row__left">
        <span className="order-item-row__name">
          {item.quantity}&times; {item.name}
        </span>
        {voidReasonLabel && <span className="order-item-row__void-reason">{voidReasonLabel}</span>}
      </div>
      <div className="order-item-row__right">
        <span className="order-item-row__price">&euro;{item.unit_price}</span>
        {!isVoided && onVoid && (
          <button
            type="button"
            className="order-item-row__void-btn"
            onClick={() => onVoid(item.public_id)}
            title="Void item"
          >
            VOID
          </button>
        )}
        <StatusChip status={item.status} />
      </div>
    </div>
  )
}
