import { useEffect, useState } from "react"
import type { ReactElement } from "react"
import {
  LuCheck,
  LuHeart,
  LuShoppingCart,
  LuWheat,
  LuFish,
  LuMilk,
  LuEgg,
  LuNut,
  LuLeaf,
  LuTriangle,
  LuFlame,
} from "react-icons/lu"
import type { MenuItem } from "@/features/menu/types"
import { formatPrice } from "../../utils"
import "./MenuItemModal.css"

type AllergenInfo = { icon: ReactElement; color: string }

function getAllergenInfo(name: string): AllergenInfo {
  const n = name.toLowerCase()
  if (
    n.includes("глютен") ||
    n.includes("пшениц") ||
    n.includes("жито") ||
    n.includes("ячмін") ||
    n.includes("wheat") ||
    n.includes("gluten")
  )
    return { icon: <LuWheat size={13} />, color: "amber" }
  if (n.includes("молок") || n.includes("лактоз") || n.includes("dairy") || n.includes("milk"))
    return { icon: <LuMilk size={13} />, color: "blue" }
  if (n.includes("яйц") || n.includes("egg")) return { icon: <LuEgg size={13} />, color: "yellow" }
  if (n.includes("риб") || n.includes("fish")) return { icon: <LuFish size={13} />, color: "blue" }
  if (n.includes("горіх") || n.includes("мигдал") || n.includes("nut"))
    return { icon: <LuNut size={13} />, color: "brown" }
  if (n.includes("соя") || n.includes("soy")) return { icon: <LuLeaf size={13} />, color: "green" }
  if (n.includes("арахіс") || n.includes("peanut"))
    return { icon: <LuFlame size={13} />, color: "orange" }
  if (n.includes("морепродукт") || n.includes("ракоподібн") || n.includes("shellfish"))
    return { icon: <LuFish size={13} />, color: "teal" }
  return { icon: <LuTriangle size={13} />, color: "red" }
}

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
    >
      <div
        className={`menu-modal${!item.image ? " menu-modal--no-image" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-modal-heading"
      >
        <button
          ref={(el) => el?.focus()}
          className="menu-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {item.image && (
          <div className="menu-modal__image-shell">
            <img className="menu-modal__image" src={item.image} alt={item.name} loading="lazy" />
          </div>
        )}

        <div className="menu-modal__content">
          <div className="menu-modal__header">
            <h2 id="menu-modal-heading" className="menu-modal__name">
              {item.name}
            </h2>
            {item.likes_count > 0 && (
              <div className="menu-modal__likes">
                <LuHeart size={13} />
                <span>{item.likes_count}</span>
              </div>
            )}
          </div>

          {item.description && <p className="menu-modal__description">{item.description}</p>}

          {item.ingredients.length > 0 && (
            <div className="menu-modal__ingredients">
              <p className="menu-modal__section-label">Склад</p>
              <ul className="menu-modal__ingredients-list">
                {item.ingredients.map((ing) => (
                  <li key={ing} className="menu-modal__ingredient-chip">
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.allergens.length > 0 && (
            <div className="menu-modal__allergens">
              <p className="menu-modal__section-label">Алергени</p>
              <div className="menu-modal__allergen-list">
                {item.allergens.map((allergen) => {
                  const { icon, color } = getAllergenInfo(allergen)
                  return (
                    <span
                      key={allergen}
                      className={`menu-modal__allergen-badge menu-modal__allergen-badge--${color}`}
                    >
                      {icon}
                      {allergen}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

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
