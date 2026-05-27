import { useEffect } from "react"
import type { CartItem } from "../hooks/useCart"
import { formatAmount } from "../utils"
import "./CartDrawer.css"

type Props = {
  items: CartItem[]
  totalPrice: number
  onSetQuantity: (publicId: string, quantity: number) => void
  onRemove: (publicId: string) => void
  onClose: () => void
}

export function CartDrawer({ items, totalPrice, onSetQuantity, onRemove, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="cart-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="cart-drawer" aria-label="Кошик">
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Кошик</h2>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="cart-drawer__empty">Кошик порожній</p>
        ) : (
          <>
            <ul className="cart-drawer__list">
              {items.map(({ item, quantity }) => (
                <li key={item.public_id} className="cart-drawer__item">
                  <div className="cart-drawer__item-info">
                    <span className="cart-drawer__item-name">{item.name}</span>
                    <span className="cart-drawer__item-price">
                      {formatAmount((parseFloat(item.price) || 0) * quantity)} ₴
                    </span>
                  </div>
                  <div className="cart-drawer__item-controls">
                    <button
                      className="cart-drawer__qty-btn"
                      onClick={() => onSetQuantity(item.public_id, quantity - 1)}
                      aria-label="Зменшити"
                    >
                      −
                    </button>
                    <span className="cart-drawer__qty">{quantity}</span>
                    <button
                      className="cart-drawer__qty-btn"
                      onClick={() => onSetQuantity(item.public_id, quantity + 1)}
                      aria-label="Збільшити"
                    >
                      +
                    </button>
                    <button
                      className="cart-drawer__remove"
                      onClick={() => onRemove(item.public_id)}
                      aria-label="Видалити"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>Разом</span>
                <span>{formatAmount(totalPrice)} ₴</span>
              </div>
              <button className="cart-drawer__order">Замовити</button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
