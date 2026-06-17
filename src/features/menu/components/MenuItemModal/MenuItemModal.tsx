import { useEffect, useRef, useState } from "react"
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
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { formatPrice } from "@/features/menu/utils"
import { menuStrings } from "@/features/menu/strings"
import "./MenuItemModal.css"

type AllergenInfo = { icon: ReactElement; color: string }

const ALLERGEN_MAP: Record<string, AllergenInfo> = {
  Глютен: { icon: <LuWheat size={13} />, color: "amber" },
  Молоко: { icon: <LuMilk size={13} />, color: "blue" },
  Яйця: { icon: <LuEgg size={13} />, color: "yellow" },
  Риба: { icon: <LuFish size={13} />, color: "blue" },
  Ракоподібні: { icon: <LuFish size={13} />, color: "teal" },
  Горіхи: { icon: <LuNut size={13} />, color: "brown" },
  Арахіс: { icon: <LuFlame size={13} />, color: "orange" },
  Соя: { icon: <LuLeaf size={13} />, color: "green" },
  Кунжут: { icon: <LuWheat size={13} />, color: "amber" },
  Сульфіти: { icon: <LuTriangle size={13} />, color: "red" },
  Селера: { icon: <LuLeaf size={13} />, color: "green" },
  Гірчиця: { icon: <LuFlame size={13} />, color: "orange" },
  Люпин: { icon: <LuLeaf size={13} />, color: "green" },
  Молюски: { icon: <LuFish size={13} />, color: "teal" },
}

function getAllergenInfo(name: string): AllergenInfo {
  return ALLERGEN_MAP[name] ?? { icon: <LuTriangle size={13} />, color: "red" }
}

type MenuItemModalProps = {
  item: MenuItem
  currencySymbol: string
  onClose: () => void
  onAddToCart: (item: MenuItem, comment?: string) => void
}

function MenuItemModal({ item, currencySymbol, onClose, onAddToCart }: MenuItemModalProps) {
  const [added, setAdded] = useState(false)
  const [comment, setComment] = useState("")
  const closeTimerRef = useRef<number | null>(null)
  // Focus trap + Esc-to-close + focus restore (focuses the close button first).
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })
  const hasWeight = item.weight_grams != null && item.weight_grams > 0

  const handleAdd = () => {
    onAddToCart(item, comment.trim() || undefined)
    setAdded(true)
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setAdded(false)
      onClose()
    }, 900)
  }

  // Clear the auto-close timer if the modal unmounts first.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
    <div
      className="menu-modal__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`menu-modal${!item.image ? " menu-modal--no-image" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-modal-heading"
      >
        <button className="menu-modal__close" onClick={onClose} aria-label={menuStrings.item.close}>
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
              <p className="menu-modal__section-label">{menuStrings.item.ingredients}</p>
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
              <p className="menu-modal__section-label">{menuStrings.item.allergens}</p>
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

          {item.is_available && (
            <div className="menu-modal__comment">
              <label htmlFor="menu-modal-comment" className="menu-modal__section-label">
                {menuStrings.item.commentLabel}
              </label>
              <textarea
                id="menu-modal-comment"
                className="menu-modal__comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={menuStrings.item.commentPlaceholder}
                rows={2}
                maxLength={500}
              />
            </div>
          )}
        </div>

        <div className="menu-modal__footer">
          <div className="menu-modal__price-block">
            <span className="menu-modal__price">
              {formatPrice(item.price)} {currencySymbol}
            </span>
            {hasWeight && item.weight_grams != null && (
              <span className="menu-modal__weight">
                {menuStrings.weightGrams(item.weight_grams)}
              </span>
            )}
          </div>
          {item.is_available ? (
            <button
              className={`menu-modal__add${added ? " menu-modal__add--added" : ""}`}
              onClick={handleAdd}
            >
              {added ? <LuCheck size={16} /> : <LuShoppingCart size={16} />}
              {added ? menuStrings.item.added : menuStrings.item.addToCart}
            </button>
          ) : (
            <span className="menu-modal__badge menu-modal__badge--unavailable">
              {menuStrings.item.unavailable}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuItemModal
