import { Fragment, type ReactElement, useMemo, useState } from "react"
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
import { formatAmount, getCurrencySymbol, isRestaurantOpenNow } from "@/features/menu/utils"
import type { MenuItem } from "@/features/menu/types"
import "./MenuPage.css"

function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [likePendingMap, setLikePendingMap] = useState<Record<string, boolean>>({})
  const user = useAppSelector((s) => s.auth.user)
  const guestToken = useMemo(() => getGuestToken(), [])

  const {
    items: cartItems,
    totalCount,
    totalPrice,
    addItem,
    removeItem,
    setQuantity,
  } = useCart(restaurantId ?? "")

  const {
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    restaurantCoverImage,
    restaurantSettings,
    restaurantNotFound,
    restaurantFetchError,
    categories,
    categoriesLoading,
    activeCategory,
    setActiveCategory,
    items,
    itemsLoading,
    loadingMore,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    setItemLikeState,
    error,
  } = useMenuPage(restaurantId ?? "", guestToken)

  const currencySymbol = restaurantSettings ? getCurrencySymbol(restaurantSettings.currency) : ""
  const priceBand = restaurantSettings
    ? currencySymbol.repeat(Math.max(1, Math.min(4, restaurantSettings.price_band)))
    : null
  const rating = restaurantSettings?.rating ?? null
  const etaMin = restaurantSettings?.eta_min_minutes ?? null
  const etaMax = restaurantSettings?.eta_max_minutes ?? null
  const openNow = restaurantSettings
    ? isRestaurantOpenNow(restaurantSettings.working_hours, restaurantSettings.timezone)
    : null
  const totalPriceLabel = formatAmount(totalPrice)

  if (!restaurantId || restaurantNotFound) {
    return (
      <main className="menu-page">
        <p className="menu-page__error">Restaurant not found.</p>
      </main>
    )
  }

  if (restaurantFetchError) {
    return (
      <main className="menu-page">
        <p className="menu-page__error">{restaurantFetchError}</p>
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
    <main className={`menu-page${totalCount > 0 ? " menu-page--has-cart-bar" : ""}`}>
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
        <div
          className={`menu-page__hero${restaurantCoverImage ? " menu-page__hero--has-cover" : ""}`}
          style={
            restaurantCoverImage
              ? ({ "--hero-cover": `url(${restaurantCoverImage})` } as React.CSSProperties)
              : undefined
          }
        >
          <p className="menu-page__label">Menu</p>
          <h1 className="menu-page__title">{restaurantName}</h1>
          <p className="menu-page__hero-description">Fresh dishes, fast ordering, cozy taste.</p>
          <div className="menu-page__hero-meta">
            {[
              openNow !== null ? (
                <span
                  key="open"
                  className={`menu-page__hero-pill${openNow ? " menu-page__hero-pill--open" : " menu-page__hero-pill--closed"}`}
                >
                  {openNow ? "Open now" : "Closed now"}
                </span>
              ) : null,
              priceBand !== null ? (
                <span key="price-band" className="menu-page__hero-pill">
                  {priceBand}
                </span>
              ) : null,
              rating !== null ? (
                <span key="rating" className="menu-page__hero-pill">
                  {Number(rating).toFixed(1)} ★
                </span>
              ) : null,
              etaMin !== null && etaMax !== null ? (
                <span key="eta" className="menu-page__hero-pill">{`${etaMin}-${etaMax} min`}</span>
              ) : null,
            ]
              .filter((pill): pill is ReactElement => pill !== null)
              .map((pill, i) => (
                <Fragment key={pill.key}>
                  {i > 0 && <span className="menu-page__hero-dot">·</span>}
                  {pill}
                </Fragment>
              ))}
          </div>
        </div>
      </header>

      <div className="menu-page__sticky-controls">
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
        <CategoryRail
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          loading={categoriesLoading}
        />
      </div>

      {error && <p className="menu-page__error">{error}</p>}

      <div className="menu-page__body">
        <div className="menu-page__content">
          {itemsLoading && items.length === 0 ? (
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
              {hasMore && (
                <button className="menu-page__load-more" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more"}
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

      {totalCount > 0 && !selectedItem && (
        <button
          className="menu-page__cart-bar"
          onClick={() => setCartOpen(true)}
          aria-label="Відкрити кошик"
        >
          <span className="menu-page__cart-bar-summary">{`${totalCount} items · ${totalPriceLabel} ${currencySymbol}`}</span>
          <span className="menu-page__cart-bar-action">Переглянути кошик</span>
        </button>
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
