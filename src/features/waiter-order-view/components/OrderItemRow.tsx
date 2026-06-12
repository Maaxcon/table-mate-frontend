import { StatusChip } from "@/components/StatusChip/StatusChip"
import type { OverlayOrderItem } from "../data/waiterTypes"
import { VOID_REASON_LABELS } from "../data/waiterTypes"
import "./OrderItemRow.css"

interface OrderItemRowProps {
  item: OverlayOrderItem
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  const isVoided = item.status === "voided"
  const voidReasonLabel =
    item.void_reason != null
      ? (VOID_REASON_LABELS[item.void_reason] ?? `reason_${item.void_reason}`)
      : null

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
        <StatusChip status={item.status} />
      </div>
    </div>
  )
}
