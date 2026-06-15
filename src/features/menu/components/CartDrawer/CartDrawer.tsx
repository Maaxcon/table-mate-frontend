import { useEffect, useState } from "react"
import {
  LuCheck,
  LuMinus,
  LuPlus,
  LuShoppingCart,
  LuTrash2,
  LuWifi,
  LuWifiOff,
  LuX,
} from "react-icons/lu"
import type { CartItemWithDetails } from "@/features/menu/hooks/useCart"
import { formatAmount } from "@/features/menu/utils"
import { menuStrings } from "@/features/menu/strings"
import "./CartDrawer.css"

type Props = {
  items: CartItemWithDetails[]
  totalPrice: number
  currencySymbol: string
  isConnected: boolean
  showConnectionStatus?: boolean
  error: string | null
  errorItemId: string | null
  displayName: string
  guestSlot: number | null
  deviceId: string
  onSetQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClose: () => void
  onClearError: () => void
  onRetry?: () => void
}

function unitPrice(ci: CartItemWithDetails): number {
  return parseFloat(ci.item?.price ?? "0") || 0
}

function lineTotal(ci: CartItemWithDetails): number {
  return unitPrice(ci) * ci.quantity
}

function isOwnGroup(
  group: ItemGroup,
  currentGuestSlot: number | null,
  currentDeviceId: string,
): boolean {
  const matchesSlot =
    currentGuestSlot != null && group.guestSlot != null && group.guestSlot === currentGuestSlot
  const matchesDevice = Boolean(
    currentDeviceId && group.deviceId && group.deviceId === currentDeviceId,
  )
  return matchesSlot || matchesDevice
}

function getGroupLabel(
  group: ItemGroup,
  displayName: string,
  currentGuestSlot: number | null,
  currentDeviceId: string,
): string {
  if (group.addedBy) {
    return group.addedBy
  }

  if (isOwnGroup(group, currentGuestSlot, currentDeviceId)) {
    return displayName ? `${menuStrings.cart.you} · ${displayName}` : menuStrings.cart.you
  }

  if (group.guestSlot != null) {
    return menuStrings.cart.slotLabel(group.guestSlot)
  }

  if (group.deviceId) {
    const suffix = group.deviceId.slice(0, 6).toUpperCase()
    return menuStrings.cart.guest(`#${suffix}`)
  }

  return menuStrings.cart.groupedBy
}

export function CartDrawer({
  items,
  totalPrice,
  currencySymbol,
  isConnected,
  showConnectionStatus = true,
  error,
  errorItemId,
  displayName,
  guestSlot: currentGuestSlot,
  deviceId,
  onSetQuantity,
  onRemoveItem,
  onClose,
  onClearError,
  onRetry,
}: Props) {
  const [step, setStep] = useState<"cart" | "confirming" | "confirmed">("cart")
  const [confirmedItems, setConfirmedItems] = useState<CartItemWithDetails[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, onClearError])

  const handleConfirm = () => {
    setConfirmedItems([...items])
    setStep("confirmed")
  }

  const confirmedTotal = confirmedItems.reduce((s, ci) => s + lineTotal(ci), 0)
  const totalCount = items.reduce((s, i) => s + i.quantity, 0)

  const groups = groupItemsByGuest(items)
  const groupedItems = [
    ...groups.filter((g) => isOwnGroup(g, currentGuestSlot, deviceId)),
    ...groups.filter((g) => !isOwnGroup(g, currentGuestSlot, deviceId)),
  ]

  return (
    <div
      className="cart-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="cart-drawer" aria-label={menuStrings.cart.title}>
        {/* ── Header ── */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title-row">
            <LuShoppingCart size={18} />
            <h2 className="cart-drawer__title">{menuStrings.cart.title}</h2>
            {totalCount > 0 && <span className="cart-drawer__count">{totalCount}</span>}
          </div>
          <div className="cart-drawer__header-right">
            {showConnectionStatus && (
              <span
                className={`cart-drawer__status ${isConnected ? "cart-drawer__status--connected" : "cart-drawer__status--disconnected"}`}
                title={isConnected ? menuStrings.cart.connected : menuStrings.cart.disconnected}
              >
                {isConnected ? <LuWifi size={12} /> : <LuWifiOff size={12} />}
              </span>
            )}
            <button
              className="cart-drawer__close"
              onClick={onClose}
              aria-label={menuStrings.cart.close}
            >
              <LuX size={16} />
            </button>
          </div>
        </div>

        {/* ── Error toast ── */}
        {error && (
          <div className="cart-drawer__toast" role="alert">
            <span className="cart-drawer__toast-text">{error}</span>
            {onRetry && (
              <button className="cart-drawer__toast-action" onClick={onRetry}>
                {menuStrings.cart.retry}
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        {step === "confirming" ? (
          /* ── Confirm dialog ── */
          <div className="cart-drawer__confirm-dialog">
            <p className="cart-drawer__confirm-dialog-title">{menuStrings.cart.confirmTitle}</p>
            <p className="cart-drawer__confirm-dialog-sub">
              {menuStrings.cart.positions(totalCount)} · {formatAmount(totalPrice)} {currencySymbol}
            </p>
            <div className="cart-drawer__confirm-dialog-btns">
              <button className="cart-drawer__confirm-dialog-yes" onClick={handleConfirm}>
                {menuStrings.cart.confirmYes}
              </button>
              <button className="cart-drawer__confirm-dialog-no" onClick={() => setStep("cart")}>
                {menuStrings.cart.confirmNo}
              </button>
            </div>
          </div>
        ) : step === "confirmed" ? (
          /* ── Confirmed ── */
          <div className="cart-drawer__confirm">
            <div className="cart-drawer__confirm-icon">
              <LuCheck size={52} strokeWidth={1.4} />
            </div>
            <h3 className="cart-drawer__confirm-title">{menuStrings.cart.confirmedTitle}</h3>
            <p className="cart-drawer__confirm-sub">{menuStrings.cart.confirmedSub}</p>

            <div className="cart-drawer__receipt">
              <p className="cart-drawer__receipt-label">{menuStrings.cart.receiptLabel}</p>
              <ul className="cart-drawer__receipt-list">
                {confirmedItems.map((ci) => (
                  <li key={ci.id} className="cart-drawer__receipt-row">
                    <span className="cart-drawer__receipt-name">
                      {ci.item?.name ?? "—"}
                      <span className="cart-drawer__receipt-qty"> × {ci.quantity}</span>
                    </span>
                    <span className="cart-drawer__receipt-price">
                      {formatAmount(lineTotal(ci))} {currencySymbol}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="cart-drawer__receipt-total">
                <span>{menuStrings.cart.total}</span>
                <span>
                  {formatAmount(confirmedTotal)} {currencySymbol}
                </span>
              </div>
            </div>

            <button className="cart-drawer__confirm-btn" onClick={onClose}>
              {menuStrings.cart.close}
            </button>
          </div>
        ) : items.length === 0 ? (
          /* ── Empty ── */
          <div className="cart-drawer__empty">
            <LuShoppingCart size={48} strokeWidth={1.2} />
            <p className="cart-drawer__empty-title">{menuStrings.cart.emptyTitle}</p>
            <p className="cart-drawer__empty-sub">{menuStrings.cart.emptySub}</p>
          </div>
        ) : (
          /* ── Item list grouped by guest ── */
          <>
            <div className="cart-drawer__list">
              {groupedItems.map((group) => (
                <div key={group.key} className="cart-drawer__group">
                  <span className="cart-drawer__group-label">
                    {getGroupLabel(group, displayName, currentGuestSlot, deviceId)}
                  </span>
                  <ul className="cart-drawer__group-list">
                    {group.items.map((ci) => (
                      <li
                        key={ci.id}
                        className={`cart-drawer__item${ci.id === errorItemId ? " cart-drawer__item--error" : ""}`}
                      >
                        {ci.item?.image ? (
                          <img
                            className="cart-drawer__item-img"
                            src={ci.item.image}
                            alt={ci.item.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="cart-drawer__item-img-placeholder" />
                        )}

                        <div className="cart-drawer__item-body">
                          <span className="cart-drawer__item-name">{ci.item?.name ?? "—"}</span>
                          <span className="cart-drawer__item-unit-price">
                            {formatAmount(unitPrice(ci))} {currencySymbol}{" "}
                            {menuStrings.cart.perUnit}
                          </span>
                        </div>

                        <div className="cart-drawer__item-right">
                          <span className="cart-drawer__item-total">
                            {formatAmount(lineTotal(ci))} {currencySymbol}
                          </span>
                          <div className="cart-drawer__stepper">
                            <button
                              className="cart-drawer__stepper-btn"
                              onClick={() =>
                                ci.quantity === 1
                                  ? onRemoveItem(ci.id)
                                  : onSetQuantity(ci.id, ci.quantity - 1)
                              }
                              aria-label={menuStrings.cart.decrease}
                            >
                              {ci.quantity === 1 ? <LuTrash2 size={12} /> : <LuMinus size={12} />}
                            </button>
                            <span className="cart-drawer__qty">{ci.quantity}</span>
                            <button
                              className="cart-drawer__stepper-btn"
                              onClick={() => onSetQuantity(ci.id, ci.quantity + 1)}
                              aria-label={menuStrings.cart.increase}
                            >
                              <LuPlus size={12} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total-row">
                <span className="cart-drawer__total-label">{menuStrings.cart.total}</span>
                <span className="cart-drawer__total-value">
                  {formatAmount(totalPrice)} {currencySymbol}
                </span>
              </div>
              <button className="cart-drawer__order" onClick={() => setStep("confirming")}>
                {menuStrings.cart.checkout}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

type ItemGroup = {
  key: string
  guestSlot: number | null
  deviceId: string | null
  addedBy: string | null
  items: CartItemWithDetails[]
}

function groupItemsByGuest(items: CartItemWithDetails[]): ItemGroup[] {
  const groups = new Map<string, ItemGroup>()

  for (const item of items) {
    const key = item.addedBy
      ? `user-${item.addedBy}`
      : item.guestSlot != null
        ? `slot-${item.guestSlot}`
        : item.deviceId
          ? `dev-${item.deviceId}`
          : "ungrouped"

    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        guestSlot: item.guestSlot,
        deviceId: item.deviceId,
        addedBy: item.addedBy,
        items: [],
      }
      groups.set(key, group)
    }
    group.items.push(item)
  }

  return Array.from(groups.values())
}
