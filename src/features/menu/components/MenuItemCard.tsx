import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  onClick: (item: MenuItem) => void
}

function MenuItemCard({ item, onClick }: MenuItemCardProps) {
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
        <span
          className={`menu-item-card__badge${item.is_available ? " menu-item-card__badge--available" : " menu-item-card__badge--unavailable"}`}
        >
          {item.is_available ? "Available" : "Unavailable"}
        </span>
      </div>
    </button>
  )
}

export default MenuItemCard
