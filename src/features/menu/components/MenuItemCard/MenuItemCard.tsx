import { memo } from "react"
import { LuHeart, LuMinus, LuPlus } from "react-icons/lu"
import type { MenuItem } from "@/features/menu/types"
import { formatPrice } from "@/features/menu/utils"
import { menuStrings } from "@/features/menu/strings"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  currencySymbol: string
  onClick: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  onToggleLike: (item: MenuItem) => void
  onChangeQuantity: (publicId: string, delta: number) => void
  cartQuantity?: number
  likePending?: boolean
  pending?: boolean
  index?: number
}

function MenuItemCard({
  item,
  currencySymbol,
  onClick,
  onAddToCart,
  onToggleLike,
  onChangeQuantity,
  cartQuantity = 0,
  likePending = false,
  pending = false,
  index = 0,
}: MenuItemCardProps) {
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeQuantity(item.public_id, -1)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
  }

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleLike(item)
  }

  const hasWeight = item.weight_grams != null && item.weight_grams > 0

  return (
    <div
      className={`menu-item-card${!item.is_available ? " menu-item-card--unavailable" : ""}`}
      style={{ "--card-index": index } as React.CSSProperties}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(item)
        }
      }}
    >
      {item.image ? (
        <img className="menu-item-card__image" src={item.image} alt={item.name} loading="lazy" />
      ) : (
        <div className="menu-item-card__image-placeholder" />
      )}

      <div className="menu-item-card__body">
        <div className="menu-item-card__name-row">
          <span className="menu-item-card__name">{item.name}</span>
        </div>
        <span
          className={`menu-item-card__description${item.description ? "" : " menu-item-card__description--empty"}`}
        >
          {item.description ?? " "}
        </span>
      </div>

      <div className="menu-item-card__footer">
        <div className="menu-item-card__footer-top">
          <span className="menu-item-card__price">
            <span className="menu-item-card__price-value">{formatPrice(item.price)}</span>
            <span className="menu-item-card__price-currency">{currencySymbol}</span>
          </span>

          {item.is_available ? (
            cartQuantity > 0 ? (
              <div className="menu-item-card__stepper">
                <button
                  className="menu-item-card__stepper-btn"
                  onClick={handleDecrement}
                  disabled={pending}
                  aria-label={menuStrings.card.decrease}
                >
                  <LuMinus size={12} strokeWidth={2.6} />
                </button>
                <span className="menu-item-card__stepper-qty">{cartQuantity}</span>
                <button
                  className="menu-item-card__stepper-btn"
                  onClick={handleIncrement}
                  disabled={pending}
                  aria-label={menuStrings.card.increase}
                >
                  <LuPlus size={12} strokeWidth={2.6} />
                </button>
              </div>
            ) : (
              <button
                className="menu-item-card__add"
                onClick={handleAdd}
                aria-label={menuStrings.card.addToCart(item.name)}
              >
                <LuPlus size={22} strokeWidth={3} />
              </button>
            )
          ) : (
            <span
              className="menu-item-card__unavailable-dot"
              aria-label={menuStrings.card.unavailable}
            />
          )}
        </div>

        <div className="menu-item-card__footer-bottom">
          {hasWeight && item.weight_grams != null && (
            <span className="menu-item-card__meta-text">
              {menuStrings.weightGrams(item.weight_grams)}
            </span>
          )}
          {hasWeight && <span className="menu-item-card__meta-dot">·</span>}
          <button
            className={`menu-item-card__like${item.is_liked ? " menu-item-card__like--active" : ""}`}
            onClick={handleToggleLike}
            disabled={likePending}
            aria-label={
              item.is_liked ? menuStrings.card.unlike(item.name) : menuStrings.card.like(item.name)
            }
          >
            <LuHeart className="menu-item-card__like-icon" size={12} />
            <span className="menu-item-card__like-count">
              {menuStrings.card.likes(item.likes_count)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Memoized: with stable handlers and per-card primitive props, only the cards
// whose item/quantity/like/pending actually changed re-render.
export default memo(MenuItemCard)
