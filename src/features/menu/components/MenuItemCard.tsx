import { LuHeart, LuMinus, LuPlus } from "react-icons/lu"
import type { MenuItem } from "@/types/menu"
import { formatPrice } from "../utils"
import "./MenuItemCard.css"

type MenuItemCardProps = {
  item: MenuItem
  onClick: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  onToggleLike: (item: MenuItem) => void
  onSetQuantity: (publicId: string, quantity: number) => void
  cartQuantity?: number
  likePending?: boolean
}

function MenuItemCard({
  item,
  onClick,
  onAddToCart,
  onToggleLike,
  onSetQuantity,
  cartQuantity = 0,
  likePending = false,
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

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleLike(item)
  }

  return (
    <div
      className={`menu-item-card${!item.is_available ? " menu-item-card--unavailable" : ""}`}
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
                  <LuMinus size={12} strokeWidth={2.6} />
                </button>
                <span className="menu-item-card__stepper-qty">{cartQuantity}</span>
                <button
                  className="menu-item-card__stepper-btn"
                  onClick={handleIncrement}
                  aria-label="Збільшити кількість"
                >
                  <LuPlus size={12} strokeWidth={2.6} />
                </button>
              </div>
            ) : (
              <button
                className="menu-item-card__add"
                onClick={handleAdd}
                aria-label={`Додати ${item.name} до кошика`}
              >
                <LuPlus size={22} strokeWidth={3} />
              </button>
            )
          ) : (
            <span className="menu-item-card__unavailable-dot" aria-label="Недоступно" />
          )}
        </div>

        <div className="menu-item-card__footer-bottom">
          {item.weight_grams && (
            <span className="menu-item-card__meta-text">{item.weight_grams} г</span>
          )}
          {item.weight_grams && <span className="menu-item-card__meta-dot">·</span>}
          <button
            className={`menu-item-card__like${item.is_liked ? " menu-item-card__like--active" : ""}`}
            onClick={handleToggleLike}
            disabled={likePending}
            aria-label={item.is_liked ? `Прибрати лайк з ${item.name}` : `Лайкнути ${item.name}`}
          >
            <LuHeart className="menu-item-card__like-icon" size={12} />
            <span className="menu-item-card__like-count">{item.likes_count} likes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuItemCard
