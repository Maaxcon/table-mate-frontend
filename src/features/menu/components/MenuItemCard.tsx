import { useState } from "react"
import { LuCheck, LuShoppingCart } from "react-icons/lu"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  onClick: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
}

function MenuItemCard({ item, onClick, onAddToCart }: MenuItemCardProps) {
  const [added, setAdded] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button className="menu-item-card" onClick={() => onClick(item)}>
      <div className="menu-item-card__body">
        <span className="menu-item-card__name">{item.name}</span>
        {item.description && (
          <span className="menu-item-card__description">{item.description}</span>
        )}
      </div>
      <div className="menu-item-card__footer">
        <span className="menu-item-card__price">{formatPrice(item.price)}</span>
        {item.is_available ? (
          <button
            className={`menu-item-card__add${added ? " menu-item-card__add--added" : ""}`}
            onClick={handleAdd}
            aria-label={`Додати ${item.name} до кошика`}
          >
            {added ? <LuCheck size={15} /> : <LuShoppingCart size={15} />}
          </button>
        ) : (
          <span className="menu-item-card__badge menu-item-card__badge--unavailable">
            Недоступно
          </span>
        )}
      </div>
    </button>
  )
}

export default MenuItemCard
