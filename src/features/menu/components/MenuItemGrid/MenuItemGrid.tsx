import MenuItemCard from "@/features/menu/components/MenuItemCard"
import type { MenuItem } from "@/features/menu/types"

type MenuItemGridProps = {
  items: MenuItem[]
  currencySymbol: string
  cartQuantities: Map<string, number>
  pendingItemIds: Set<string>
  isLikePending: (publicId: string) => boolean
  onSelect: (item: MenuItem) => void
  onAddToCart: (item: MenuItem) => void
  onToggleLike: (item: MenuItem) => void
  onChangeQuantity: (publicId: string, delta: number) => void
}

/** A responsive grid of dish cards, wired to the cart/like handlers. */
function MenuItemGrid({
  items,
  currencySymbol,
  cartQuantities,
  pendingItemIds,
  isLikePending,
  onSelect,
  onAddToCart,
  onToggleLike,
  onChangeQuantity,
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
          onChangeQuantity={onChangeQuantity}
          likePending={isLikePending(item.public_id)}
          cartQuantity={cartQuantities.get(item.public_id) ?? 0}
          pending={pendingItemIds.has(item.public_id)}
        />
      ))}
    </div>
  )
}

export default MenuItemGrid
