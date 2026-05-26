import { useState } from "react"
import { LuCheck, LuShoppingCart } from "react-icons/lu"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  onClick: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  cartQuantity?: number
}

function MenuItemCard({ item, onClick, onAddToCart, cartQuantity = 0 }: MenuItemCardProps) {
  const [added, setAdded] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <button
      className={`menu-item-card${!item.is_available ? " menu-item-card--unavailable" : ""}`}
      onClick={() => onClick(item)}
    >
      {cartQuantity > 0 && <span className="menu-item-card__qty-badge">{cartQuantity}</span>}

      <div className="menu-item-card__body">
        <span className="menu-item-card__name">{item.name}</span>
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
          <button
            className={`menu-item-card__add${added ? " menu-item-card__add--added" : ""}`}
            onClick={handleAdd}
            aria-label={`Додати ${item.name} до кошика`}
          >
            {added ? <LuCheck size={14} strokeWidth={2.5} /> : <LuShoppingCart size={14} />}
          </button>
        ) : (
          <span className="menu-item-card__unavailable-dot" aria-label="Недоступно" />
        )}
      </div>
    </button>
  )
}

export default MenuItemCard
