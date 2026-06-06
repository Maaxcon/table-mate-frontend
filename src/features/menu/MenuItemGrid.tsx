import { MenuItemCard } from "./components"
import type { MenuItem } from "./types"

type MenuItemGridProps = {
  items: MenuItem[]
  currencySymbol: string
  cartQuantities: Map<string, number>
  isLikePending: (publicId: string) => boolean
  onSelect: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  onToggleLike: (item: MenuItem) => void
  onSetQuantity: (publicId: string, quantity: number) => void
}

/** A responsive grid of dish cards, wired to the cart/like handlers. */
function MenuItemGrid({
  items,
  currencySymbol,
  cartQuantities,
  isLikePending,
  onSelect,
  onAddToCart,
  onToggleLike,
  onSetQuantity,
}: MenuItemGridProps) {
  return (
    <div className="menu-page__grid">
      {items.map((item) => (
        <MenuItemCard
          key={item.public_id}
          item={item}
          currencySymbol={currencySymbol}
          onClick={onSelect}
          onAddToCart={onAddToCart}
          onToggleLike={onToggleLike}
          onSetQuantity={onSetQuantity}
          likePending={isLikePending(item.public_id)}
          cartQuantity={cartQuantities.get(item.public_id) ?? 0}
        />
      ))}
    </div>
  )
}

export default MenuItemGrid
