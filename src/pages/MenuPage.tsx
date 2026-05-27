import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { LuShoppingCart } from "react-icons/lu"
import logo from "@/assets/logo.png"
import { useAppSelector } from "@/store/hooks"
import { toggleItemLike } from "@/features/menu/api"
import {
  CartDrawer,
  CategoryRail,
  MenuEmptyState,
  MenuItemCard,
  MenuItemModal,
  MenuSkeleton,
  RestaurantInfoPanel,
} from "@/features/menu/components"
import { getGuestToken } from "@/features/menu/guestToken"
import { useCart } from "@/features/menu/hooks/useCart"
import { useMenuPage } from "@/features/menu/hooks/useMenuPage"
import { getCurrencySymbol, isRestaurantOpenNow } from "@/features/menu/utils"
import type { MenuItem } from "@/types/menu"
import "./MenuPage.css"

function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [likePendingMap, setLikePendingMap] = useState<Record<string, boolean>>({})
  const user = useAppSelector((s) => s.auth.user)
  const guestToken = useMemo(() => getGuestToken(), [])

  const { items: cartItems, totalCount, totalPrice, addItem, removeItem, setQuantity } = useCart()

  const {
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    restaurantSettings,
    categories,
    categoriesLoading,
    activeCategory,
    setActiveCategory,
    items,
    itemsLoading,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    setItemLikeState,
    error,
  } = useMenuPage(restaurantId ?? "", guestToken)

  const currencyCode = restaurantSettings?.currency ?? "UAH"
  const currencySymbol = getCurrencySymbol(currencyCode)
  const priceBandValue = restaurantSettings?.price_band ?? 2
  const priceBand = currencySymbol.repeat(Math.max(1, Math.min(4, priceBandValue)))
  const rating = restaurantSettings?.rating ?? "4.80"
  const etaMin = restaurantSettings?.eta_min_minutes ?? 20
  const etaMax = restaurantSettings?.eta_max_minutes ?? 30
  const openNow = restaurantSettings
    ? isRestaurantOpenNow(restaurantSettings.working_hours, restaurantSettings.timezone)
    : true

  if (!restaurantId) {
    return (
      <main className="menu-page">
        <p className="menu-page__error">Restaurant not found.</p>
      </main>
    )
  }

  const handleToggleLike = async (item: MenuItem) => {
    if (likePendingMap[item.public_id]) return
    setLikePendingMap((prev) => ({ ...prev, [item.public_id]: true }))
    try {
      const updated = await toggleItemLike(restaurantId, item.public_id, guestToken)
      setItemLikeState(item.public_id, updated.is_liked, updated.likes_count)
      setSelectedItem((prev) =>
        prev && prev.public_id === item.public_id
          ? {
              ...prev,
              is_liked: updated.is_liked,
              likes_count: updated.likes_count,
            }
          : prev,
      )
    } finally {
      setLikePendingMap((prev) => ({ ...prev, [item.public_id]: false }))
    }
  }

  return (
    <main className="menu-page">
      <header className="menu-page__header">
        <div className="menu-page__topbar">
          <div className="menu-page__brand">
            <img src={logo} alt="TableMate" className="menu-page__logo" />
            <div className="menu-page__brand-copy">
              <span className="menu-page__brand-name">TableMate</span>
            </div>
          </div>
          <div className="menu-page__topbar-right">
            {user ? (
              <div className="menu-page__avatar" title={`${user.firstName} ${user.lastName}`}>
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
            ) : (
              <Link to="/" className="menu-page__signin">
                Увійти
              </Link>
            )}
          </div>
        </div>
        <div className="menu-page__searchrow">
          <input
            className="menu-page__search"
            type="search"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="menu-page__cart-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Кошик"
          >
            <LuShoppingCart size={18} />
            {totalCount > 0 && <span className="menu-page__cart-badge">{totalCount}</span>}
          </button>
        </div>
        <div className="menu-page__hero">
          <p className="menu-page__label">Menu</p>
          <h1 className="menu-page__title">{restaurantName ?? "TableMate Demo"}</h1>
          <p className="menu-page__hero-description">Fresh dishes, fast ordering, cozy taste.</p>
          <div className="menu-page__hero-meta">
            <span
              className={`menu-page__hero-pill${openNow ? " menu-page__hero-pill--open" : " menu-page__hero-pill--closed"}`}
            >
              {openNow ? "Open now" : "Closed now"}
            </span>
            <span className="menu-page__hero-dot">·</span>
            <span className="menu-page__hero-pill">{priceBand}</span>
            <span className="menu-page__hero-dot">·</span>
            <span className="menu-page__hero-pill">{Number(rating).toFixed(1)} ★</span>
            <span className="menu-page__hero-dot">·</span>
            <span className="menu-page__hero-pill">{`${etaMin}-${etaMax} min`}</span>
          </div>
        </div>
      </header>

      <CategoryRail
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        loading={categoriesLoading}
      />

      {error && <p className="menu-page__error">{error}</p>}

      <div className="menu-page__body">
        <div className="menu-page__content">
          {itemsLoading ? (
            <MenuSkeleton count={6} />
          ) : items.length === 0 ? (
            <MenuEmptyState
              message={
                searchQuery ? `No results for "${searchQuery}".` : "No items in this category."
              }
            />
          ) : (
            <>
              <div className="menu-page__grid">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.public_id}
                    item={item}
                    onClick={setSelectedItem}
                    onAddToCart={addItem}
                    onToggleLike={handleToggleLike}
                    onSetQuantity={setQuantity}
                    likePending={Boolean(likePendingMap[item.public_id])}
                    cartQuantity={
                      cartItems.find((c) => c.item.public_id === item.public_id)?.quantity ?? 0
                    }
                  />
                ))}
              </div>
              {hasMore && !itemsLoading && (
                <button className="menu-page__load-more" onClick={loadMore}>
                  Load more
                </button>
              )}
            </>
          )}
        </div>

        <RestaurantInfoPanel
          address={restaurantAddress}
          phone={restaurantPhone}
          settings={restaurantSettings}
        />
      </div>

      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={addItem}
        />
      )}

      {cartOpen && (
        <CartDrawer
          items={cartItems}
          totalPrice={totalPrice}
          onSetQuantity={setQuantity}
          onRemove={removeItem}
          onClose={() => setCartOpen(false)}
        />
      )}
    </main>
  )
}

export default MenuPage
