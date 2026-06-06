import { useEffect, useState } from "react"
import { LuCheck, LuMinus, LuPlus, LuShoppingCart, LuTrash2, LuX } from "react-icons/lu"
import type { CartItem } from "../../hooks/useCart"
import { formatAmount } from "../../utils"
import { menuStrings } from "../../strings"
import "./CartDrawer.css"

type Props = {
  items: CartItem[]
  totalPrice: number
  currencySymbol: string
  onSetQuantity: (publicId: string, quantity: number) => void
  onClose: () => void
  onClear?: () => void
}

export function CartDrawer({
  items,
  totalPrice,
  currencySymbol,
  onSetQuantity,
  onClose,
  onClear,
}: Props) {
  const [step, setStep] = useState<"cart" | "confirming" | "confirmed">("cart")
  const [confirmedItems, setConfirmedItems] = useState<CartItem[]>([])
  const [confirmedTotal, setConfirmedTotal] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleConfirm = () => {
    setConfirmedItems([...items])
    setConfirmedTotal(totalPrice)
    setStep("confirmed")
    onClear?.()
  }

  const totalCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div
      className="cart-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="cart-drawer" aria-label={menuStrings.cart.title}>
        <div className="cart-drawer__header">
          <div className="cart-drawer__title-row">
            <LuShoppingCart size={18} />
            <h2 className="cart-drawer__title">{menuStrings.cart.title}</h2>
            {totalCount > 0 && <span className="cart-drawer__count">{totalCount}</span>}
          </div>
          <button
            className="cart-drawer__close"
            onClick={onClose}
            aria-label={menuStrings.cart.close}
          >
            <LuX size={16} />
          </button>
        </div>

        {step === "confirming" ? (
          <div className="cart-drawer__confirm-dialog">
            <p className="cart-drawer__confirm-dialog-title">{menuStrings.cart.confirmTitle}</p>
            <p className="cart-drawer__confirm-dialog-sub">
              {menuStrings.cart.positions(items.reduce((s, i) => s + i.quantity, 0))} ·{" "}
              {formatAmount(totalPrice)} {currencySymbol}
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
          <div className="cart-drawer__confirm">
            <div className="cart-drawer__confirm-icon">
              <LuCheck size={52} strokeWidth={1.4} />
            </div>
            <h3 className="cart-drawer__confirm-title">{menuStrings.cart.confirmedTitle}</h3>
            <p className="cart-drawer__confirm-sub">{menuStrings.cart.confirmedSub}</p>

            <div className="cart-drawer__receipt">
              <p className="cart-drawer__receipt-label">{menuStrings.cart.receiptLabel}</p>
              <ul className="cart-drawer__receipt-list">
                {confirmedItems.map(({ item, quantity }) => (
                  <li key={item.public_id} className="cart-drawer__receipt-row">
                    <span className="cart-drawer__receipt-name">
                      {item.name}
                      <span className="cart-drawer__receipt-qty"> × {quantity}</span>
                    </span>
                    <span className="cart-drawer__receipt-price">
                      {formatAmount((parseFloat(item.price) || 0) * quantity)} {currencySymbol}
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
          <div className="cart-drawer__empty">
            <LuShoppingCart size={48} strokeWidth={1.2} />
            <p className="cart-drawer__empty-title">{menuStrings.cart.emptyTitle}</p>
            <p className="cart-drawer__empty-sub">{menuStrings.cart.emptySub}</p>
          </div>
        ) : (
          <>
            <ul className="cart-drawer__list">
              {items.map(({ item, quantity }) => (
                <li key={item.public_id} className="cart-drawer__item">
                  {item.image ? (
                    <img
                      className="cart-drawer__item-img"
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="cart-drawer__item-img-placeholder" />
                  )}

                  <div className="cart-drawer__item-body">
                    <span className="cart-drawer__item-name">{item.name}</span>
                    <span className="cart-drawer__item-unit-price">
                      {formatAmount(parseFloat(item.price) || 0)} {currencySymbol}{" "}
                      {menuStrings.cart.perUnit}
                    </span>
                  </div>

                  <div className="cart-drawer__item-right">
                    <span className="cart-drawer__item-total">
                      {formatAmount((parseFloat(item.price) || 0) * quantity)} {currencySymbol}
                    </span>
                    <div className="cart-drawer__stepper">
                      <button
                        className="cart-drawer__stepper-btn"
                        onClick={() => onSetQuantity(item.public_id, quantity - 1)}
                        aria-label={menuStrings.cart.decrease}
                      >
                        {quantity === 1 ? <LuTrash2 size={12} /> : <LuMinus size={12} />}
                      </button>
                      <span className="cart-drawer__qty">{quantity}</span>
                      <button
                        className="cart-drawer__stepper-btn"
                        onClick={() => onSetQuantity(item.public_id, quantity + 1)}
                        aria-label={menuStrings.cart.increase}
                      >
                        <LuPlus size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

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
