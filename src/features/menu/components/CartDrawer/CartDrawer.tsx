import { useEffect } from "react"
import { LuMinus, LuPlus, LuShoppingCart, LuTrash2, LuX } from "react-icons/lu"
import type { CartItem } from "../../hooks/useCart"
import { formatAmount } from "../../utils"
import "./CartDrawer.css"

type Props = {
  items: CartItem[]
  totalPrice: number
  onSetQuantity: (publicId: string, quantity: number) => void
  onRemove: (publicId: string) => void
  onClose: () => void
}

export function CartDrawer({ items, totalPrice, onSetQuantity, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const totalCount = items.reduce((s, i) => s + i.quantity, 0)

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
          <div className="cart-drawer__title-row">
            <LuShoppingCart size={18} />
            <h2 className="cart-drawer__title">Кошик</h2>
            {totalCount > 0 && <span className="cart-drawer__count">{totalCount}</span>}
          </div>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Закрити">
            <LuX size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <LuShoppingCart size={48} strokeWidth={1.2} />
            <p className="cart-drawer__empty-title">Кошик порожній</p>
            <p className="cart-drawer__empty-sub">Додайте страви з меню</p>
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
                      {formatAmount(parseFloat(item.price) || 0)} ₴ / шт
                    </span>
                  </div>

                  <div className="cart-drawer__item-right">
                    <span className="cart-drawer__item-total">
                      {formatAmount((parseFloat(item.price) || 0) * quantity)} ₴
                    </span>
                    <div className="cart-drawer__stepper">
                      <button
                        className="cart-drawer__stepper-btn"
                        onClick={() => onSetQuantity(item.public_id, quantity - 1)}
                        aria-label="Зменшити"
                      >
                        {quantity === 1 ? <LuTrash2 size={12} /> : <LuMinus size={12} />}
                      </button>
                      <span className="cart-drawer__qty">{quantity}</span>
                      <button
                        className="cart-drawer__stepper-btn"
                        onClick={() => onSetQuantity(item.public_id, quantity + 1)}
                        aria-label="Збільшити"
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
                <span className="cart-drawer__total-label">Разом</span>
                <span className="cart-drawer__total-value">{formatAmount(totalPrice)} ₴</span>
              </div>
              <button className="cart-drawer__order" disabled>
                Оформити замовлення
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
