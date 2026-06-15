import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { LuArrowDownUp, LuShoppingCart } from "react-icons/lu"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { clearAuth } from "@/store/auth/authSlice"
import {
  CartDrawer,
  CategoryRail,
  MenuEmptyState,
  MenuFooter,
  MenuHeader,
  MenuItemGrid,
  MenuItemModal,
  MenuSkeleton,
  RestaurantInfoPanel,
} from "@/features/menu/components"
import { getGuestToken } from "@/features/menu/guestToken"
import { useCart } from "@/features/menu/hooks/useCart"
import { useCartSocket } from "@/features/menu/hooks/useCartSocket"
import { useGuestAuth } from "@/features/menu/hooks/useGuestAuth"
import { useItemLikes } from "@/features/menu/hooks/useItemLikes"
import { useMenuPage } from "@/features/menu/hooks/useMenuPage"
import { menuStrings } from "@/features/menu/strings"
import { formatAmount, getCurrencySymbol } from "@/features/menu/utils"
import type { MenuItem } from "@/features/menu/types"
import "./MenuPage.css"

function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get("reservation") ?? undefined
  const tableId = searchParams.get("table") ?? undefined
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrollActiveCategory, setScrollActiveCategory] = useState<string | null>(null)
  const [lobbyName, setLobbyName] = useState("")
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const deviceId = useMemo(() => getGuestToken(), [])

  const guestAuth = useGuestAuth({
    reservationId,
    tableId,
  })

  const {
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    restaurantCoverImage,
    restaurantTelegramUrl,
    restaurantFacebookUrl,
    restaurantSettings,
    restaurantNotFound,
    restaurantFetchError,
    categories,
    categoriesLoading,
    activeCategory,
    setActiveCategory,
    items: menuItems,
    itemsLoading,
    loadingMore,
    hasMore,
    loadMore,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    setItemLikeState,
    error,
  } = useMenuPage(restaurantId ?? "", deviceId)

  const itemsById = useMemo(() => {
    const map: Record<string, MenuItem> = {}
    for (const item of menuItems) {
      map[item.public_id] = item
    }
    return map
  }, [menuItems])

  const {
    items: cartItems,
    totalCount,
    totalPrice,
    error: cartError,
    errorItemId,
    addItem,
    setQuantity,
    removeItem,
    refetch,
    clearError,
  } = useCart({
    cartSessionId: guestAuth.cartSessionId,
    guestJwt: guestAuth.guestJwt,
    itemsById,
    reserved: guestAuth.status === "ready",
  })

  const handleCartUpdated = useCallback(() => {
    refetch()
  }, [refetch])

  const { isConnected } = useCartSocket({
    cartSessionId: guestAuth.cartSessionId,
    guestJwt: guestAuth.guestJwt,
    onCartUpdated: handleCartUpdated,
  })

  const showLobby = Boolean(
    (reservationId || tableId) && guestAuth.status === "ready" && guestAuth.displayName === "",
  )

  const handleLobbyJoin = useCallback(() => {
    const name = lobbyName.trim()
    if (name) {
      guestAuth.setDisplayName(name)
    }
  }, [lobbyName, guestAuth])

  const handleLobbySkip = useCallback(() => {
    guestAuth.setDisplayName("Anonymous")
  }, [guestAuth])

  // Reflect a like in both the grid and the open modal.
  const handleLiked = useCallback(
    (publicId: string, isLiked: boolean, likesCount: number) => {
      setItemLikeState(publicId, isLiked, likesCount)
      setSelectedItem((prev) =>
        prev && prev.public_id === publicId
          ? { ...prev, is_liked: isLiked, likes_count: likesCount }
          : prev,
      )
    },
    [setItemLikeState],
  )
  const { isPending: isLikePending, toggleLike } = useItemLikes(
    restaurantId ?? "",
    deviceId,
    handleLiked,
  )

  const showAllGrouped = activeCategory === null && !searchQuery

  const groupedItems = useMemo(() => {
    if (!showAllGrouped || categories.length === 0) return null
    const map = new Map<string, MenuItem[]>()
    for (const cat of categories) map.set(cat.public_id, [])
    for (const item of menuItems) {
      if (item.category && map.has(item.category)) map.get(item.category)!.push(item)
    }
    return map
  }, [showAllGrouped, categories, menuItems])

  const cartQuantities = useMemo(
    () => new Map(Array.isArray(cartItems) ? cartItems.map((c) => [c.menuItemId, c.quantity]) : []),
    [cartItems],
  )

  useEffect(() => {
    if (!groupedItems) return
    const refs = sectionRefs.current
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-category-id")
          if (id) setScrollActiveCategory(id)
        }
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    )
    refs.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [groupedItems])

  const handleCategorySelect = (id: string | null) => {
    if (id === null) {
      setActiveCategory(null)
      setScrollActiveCategory(null)
    } else if (showAllGrouped) {
      const el = sectionRefs.current.get(id)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      setActiveCategory(id)
    }
  }

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      if (!guestAuth.guestJwt) return
      addItem(item.public_id)
    },
    [addItem, guestAuth.guestJwt],
  )

  // The server assigns the slot per device; read ours back from the cart.
  const guestSlot = cartItems.find((ci) => ci.deviceId === guestAuth.deviceId)?.guestSlot ?? null

  const handleSetQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const cartItem = cartItems.find((ci) => ci.menuItemId === itemId || ci.id === itemId)
      const targetId = cartItem?.id ?? itemId
      if (quantity <= 0) {
        removeItem(targetId)
      } else {
        setQuantity(targetId, quantity)
      }
    },
    [cartItems, removeItem, setQuantity],
  )

  const railActiveCategory = showAllGrouped ? scrollActiveCategory : activeCategory
  const currencySymbol = restaurantSettings ? getCurrencySymbol(restaurantSettings.currency) : ""
  const totalPriceLabel = formatAmount(totalPrice)

  const gridHandlers = {
    currencySymbol,
    cartQuantities,
    isLikePending,
    onSelect: setSelectedItem,
    onAddToCart: handleAddToCart,
    onToggleLike: toggleLike,
    onSetQuantity: handleSetQuantity,
  }

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

  const loadMoreButton = hasMore ? (
    <button className="menu-page__load-more" onClick={loadMore} disabled={loadingMore}>
      {loadingMore ? menuStrings.grid.loadingMore : menuStrings.grid.loadMore}
    </button>
  ) : null

  return (
    <main className={`menu-page${totalCount > 0 ? " menu-page--has-cart-bar" : ""}`}>
      <MenuHeader
        name={restaurantName}
        coverImage={restaurantCoverImage}
        settings={restaurantSettings}
        user={user}
        restaurantId={restaurantId}
        onSignOut={() => dispatch(clearAuth())}
      />

      <div className="menu-page__sticky-controls">
        <div className="menu-page__searchrow">
          <input
            className="menu-page__search"
            type="search"
            placeholder={menuStrings.controls.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`menu-page__sort-btn${sortOrder !== "sort_order" ? " menu-page__sort-btn--active" : ""}`}
            onClick={() =>
              setSortOrder(
                sortOrder === "sort_order"
                  ? "price"
                  : sortOrder === "price"
                    ? "-price"
                    : "sort_order",
              )
            }
            aria-label={menuStrings.controls.sortAria}
            title={
              sortOrder === "sort_order"
                ? menuStrings.controls.sortTitleDefault
                : sortOrder === "price"
                  ? menuStrings.controls.sortTitlePriceAsc
                  : menuStrings.controls.sortTitlePriceDesc
            }
          >
            <LuArrowDownUp size={16} />
            <span className="menu-page__sort-label">
              {sortOrder === "price"
                ? menuStrings.controls.sortLabelPriceAsc
                : sortOrder === "-price"
                  ? menuStrings.controls.sortLabelPriceDesc
                  : menuStrings.controls.sortLabelDefault}
            </span>
          </button>
          <button
            className="menu-page__cart-btn"
            onClick={() => setCartOpen(true)}
            aria-label={menuStrings.controls.cartAria}
          >
            <LuShoppingCart size={18} />
            {totalCount > 0 && <span className="menu-page__cart-badge">{totalCount}</span>}
          </button>
        </div>
        <CategoryRail
          categories={categories}
          activeCategory={railActiveCategory}
          onSelect={handleCategorySelect}
          loading={categoriesLoading}
        />
      </div>

      {error && <p className="menu-page__error">{error}</p>}

      <div className="menu-page__body">
        <div className="menu-page__content">
          {itemsLoading && menuItems.length === 0 ? (
            <div className="menu-page__grid">
              <MenuSkeleton count={6} />
            </div>
          ) : menuItems.length === 0 ? (
            <MenuEmptyState
              message={
                searchQuery ? menuStrings.grid.noResults(searchQuery) : menuStrings.grid.noItems
              }
            />
          ) : showAllGrouped && groupedItems ? (
            <>
              {categories.map((cat) => {
                const catItems = groupedItems.get(cat.public_id) ?? []
                if (catItems.length === 0) return null
                return (
                  <section
                    key={cat.public_id}
                    className="menu-page__category-section"
                    data-category-id={cat.public_id}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(cat.public_id, el)
                      else sectionRefs.current.delete(cat.public_id)
                    }}
                  >
                    <h2 className="menu-page__category-heading">{cat.name}</h2>
                    <MenuItemGrid items={catItems} {...gridHandlers} />
                  </section>
                )
              })}
              {loadMoreButton}
            </>
          ) : (
            <>
              <MenuItemGrid items={menuItems} {...gridHandlers} />
              {loadMoreButton}
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
          currencySymbol={currencySymbol}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {totalCount > 0 && !selectedItem && (
        <button
          className="menu-page__cart-bar"
          onClick={() => setCartOpen(true)}
          aria-label={menuStrings.cartBar.openAria}
        >
          <span className="menu-page__cart-bar-summary">{`${totalCount} items · ${totalPriceLabel} ${currencySymbol}`}</span>
          <span className="menu-page__cart-bar-action">{menuStrings.cartBar.action}</span>
        </button>
      )}

      {/* ── Lobby modal ── */}
      {showLobby && (
        <div
          className="menu-page__lobby-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleLobbySkip()
          }}
        >
          <div className="menu-page__lobby">
            <h2 className="menu-page__lobby-title">{menuStrings.cart.lobbyTitle}</h2>
            <p className="menu-page__lobby-sub">{menuStrings.cart.lobbySubtitle}</p>
            <form
              className="menu-page__lobby-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleLobbyJoin()
              }}
            >
              <input
                className="menu-page__lobby-input"
                type="text"
                placeholder={menuStrings.cart.lobbyPlaceholder}
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                maxLength={30}
              />
              <div className="menu-page__lobby-actions">
                <button type="submit" className="menu-page__lobby-join">
                  {menuStrings.cart.lobbyJoin}
                </button>
                <button type="button" className="menu-page__lobby-skip" onClick={handleLobbySkip}>
                  {menuStrings.cart.lobbySkipped}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <CartDrawer
          items={cartItems}
          totalPrice={totalPrice}
          currencySymbol={currencySymbol}
          isConnected={isConnected}
          error={cartError}
          errorItemId={errorItemId}
          displayName={guestAuth.displayName}
          guestSlot={guestSlot}
          deviceId={guestAuth.deviceId}
          onSetQuantity={handleSetQuantity}
          onRemoveItem={removeItem}
          onClose={() => setCartOpen(false)}
          onClearError={clearError}
          onRetry={refetch}
        />
      )}

      <MenuFooter telegramUrl={restaurantTelegramUrl} facebookUrl={restaurantFacebookUrl} />
    </main>
  )
}

export default MenuPage
