import { StatusChip } from "@/components/StatusChip/StatusChip"
import type { OverlayOrderItem } from "../data/mockData"
import "./OrderItemRow.css"

interface OrderItemRowProps {
  item: OverlayOrderItem
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  const isVoided = item.status === "voided"

  return (
    <div className={`order-item-row ${isVoided ? "order-item-row--voided" : ""}`}>
      <div className="order-item-row__left">
        <span className="order-item-row__name">
          {item.quantity}&times; {item.name}
        </span>
        {item.void_reason && (
          <span className="order-item-row__void-reason">{item.void_reason}</span>
        )}
      </div>
      <div className="order-item-row__right">
        <span className="order-item-row__price">&euro;{item.price}</span>
        <StatusChip status={item.status} />
      </div>
    </div>
  )
}
