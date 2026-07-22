import { useState } from "react"
import { StatusChip } from "@/components/StatusChip/StatusChip"
import type { OverlayOrderItem } from "../../types"
import { VOID_REASON_LABELS } from "../../types"
import type { VoidReason } from "@/types/api/types.gen"
import "./OrderItemRow.css"
import { useWaiterStrings } from "../../strings"

interface OrderItemRowProps {
  item: OverlayOrderItem
  currencySymbol: string
  voidReasons?: VoidReason[]
  onMarkServed?: (itemId: string) => void
  onVoid?: (itemId: string, reasonCode: string) => void
}

export function OrderItemRow({
  item,
  currencySymbol,
  voidReasons,
  onMarkServed,
  onVoid,
}: OrderItemRowProps) {
  const [pickingVoidReason, setPickingVoidReason] = useState(false)
  const overlayStrings = useWaiterStrings().overlay
  const voidReasonStrings = overlayStrings.voidReasons
  const isVoided = item.status === "voided"
  const reasonKey = item.void_reason != null ? VOID_REASON_LABELS[item.void_reason] : null
  const voidReasonLabel = reasonKey
    ? (voidReasonStrings[reasonKey as keyof typeof voidReasonStrings] ?? reasonKey)
    : null

  return (
    <div className={`order-item-row ${isVoided ? "order-item-row--voided" : ""}`}>
      <div className="order-item-row__left">
        <span className="order-item-row__name">
          {item.quantity}&times; {item.name}
        </span>
        {item.comment && <span className="order-item-row__comment">{item.comment}</span>}
        {voidReasonLabel && <span className="order-item-row__void-reason">{voidReasonLabel}</span>}
        {pickingVoidReason && voidReasons && voidReasons.length > 0 && (
          <select
            className="order-item-row__void-select"
            defaultValue=""
            onChange={(e) => {
              const code = e.target.value
              if (code) onVoid?.(item.public_id, code)
              setPickingVoidReason(false)
            }}
            onBlur={() => setPickingVoidReason(false)}
          >
            <option value="" disabled>
              Void reason…
            </option>
            {voidReasons.map((reason) => (
              <option key={reason.code} value={reason.code}>
                {reason.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="order-item-row__right">
        <span className="order-item-row__price">
          {currencySymbol}
          {item.unit_price}
        </span>
        {!isVoided && item.status === "ready" && onMarkServed && (
          <button
            type="button"
            className="order-item-row__serve-btn"
            onClick={() => onMarkServed(item.public_id)}
            title="Mark served"
          >
            SERVED
          </button>
        )}
        {!isVoided && onVoid && (
          <button
            type="button"
            className="order-item-row__void-btn"
            onClick={() => setPickingVoidReason((v) => !v)}
            title="Void item"
          >
            VOID
          </button>
        )}
        {!isVoided && item.is_paid && (
          <span className="order-item-row__paid-badge">{overlayStrings.paidBadge}</span>
        )}
        <StatusChip status={item.status} />
      </div>
    </div>
  )
}
