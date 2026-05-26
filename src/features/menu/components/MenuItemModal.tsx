import { useEffect, useState } from "react"
import { LuCheck, LuShoppingCart } from "react-icons/lu"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemModal.css"

type MenuItemModalProps = {
  item: MenuItem
  onClose: () => void
  onAddToCart: (item: MenuItem) => void
}

function MenuItemModal({ item, onClose, onAddToCart }: MenuItemModalProps) {
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    onAddToCart(item)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      onClose()
    }, 900)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="menu-modal__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div className="menu-modal" role="dialog" aria-modal="true">
        <div className="menu-modal__header">
          <h2 className="menu-modal__name">{item.name}</h2>
          <button className="menu-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {item.description && <p className="menu-modal__description">{item.description}</p>}

        {item.ingredients.length > 0 && (
          <div className="menu-modal__ingredients">
            <p className="menu-modal__ingredients-label">Склад</p>
            <ul className="menu-modal__ingredients-list">
              {item.ingredients.map((ing) => (
                <li key={ing} className="menu-modal__ingredient-chip">
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="menu-modal__footer">
          <div className="menu-modal__price-block">
            <span className="menu-modal__price">{formatPrice(item.price)} ₴</span>
            {item.weight_grams && <span className="menu-modal__weight">{item.weight_grams} г</span>}
          </div>
          {item.is_available ? (
            <button
              className={`menu-modal__add${added ? " menu-modal__add--added" : ""}`}
              onClick={handleAdd}
            >
              {added ? <LuCheck size={16} /> : <LuShoppingCart size={16} />}
              {added ? "Додано" : "До кошика"}
            </button>
          ) : (
            <span className="menu-modal__badge menu-modal__badge--unavailable">Недоступно</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuItemModal
