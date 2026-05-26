import { LuMinus, LuPlus } from "react-icons/lu"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  onClick: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  onSetQuantity: (publicId: string, quantity: number) => void
  cartQuantity?: number
}

function MenuItemCard({
  item,
  onClick,
  onAddToCart,
  onSetQuantity,
  cartQuantity = 0,
}: MenuItemCardProps) {
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSetQuantity(item.public_id, cartQuantity - 1)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
  }

  return (
    <div
      className={`menu-item-card${!item.is_available ? " menu-item-card--unavailable" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
    >
      <div className="menu-item-card__body">
        <div className="menu-item-card__name-row">
          <span className="menu-item-card__name">{item.name}</span>
          {item.weight_grams && (
            <span className="menu-item-card__weight">{item.weight_grams} г</span>
          )}
        </div>
        {item.description && (
          <span className="menu-item-card__description">{item.description}</span>
        )}
      </div>

      <div className="menu-item-card__footer">
        <span className="menu-item-card__price">
          <span className="menu-item-card__price-value">{formatPrice(item.price)}</span>
          <span className="menu-item-card__price-currency">₴</span>
        </span>

        {item.is_available ? (
          cartQuantity > 0 ? (
            <div className="menu-item-card__stepper">
              <button
                className="menu-item-card__stepper-btn"
                onClick={handleDecrement}
                aria-label="Зменшити кількість"
              >
                <LuMinus size={11} strokeWidth={2.5} />
              </button>
              <span className="menu-item-card__stepper-qty">{cartQuantity}</span>
              <button
                className="menu-item-card__stepper-btn"
                onClick={handleIncrement}
                aria-label="Збільшити кількість"
              >
                <LuPlus size={11} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              className="menu-item-card__add"
              onClick={handleAdd}
              aria-label={`Додати ${item.name} до кошика`}
            >
              <LuPlus size={14} strokeWidth={2.5} />
            </button>
          )
        ) : (
          <span className="menu-item-card__unavailable-dot" aria-label="Недоступно" />
        )}
      </div>
    </div>
  )
}

export default MenuItemCard
