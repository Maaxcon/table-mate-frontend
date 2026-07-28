import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { LuArrowDown, LuLoaderCircle, LuShoppingCart, LuX } from "react-icons/lu"
import { apiFetch } from "@/api/client"
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
import { checkout } from "@/features/menu/api"
import { useBill } from "@/features/menu/hooks/useBill"
import { useCart } from "@/features/menu/hooks/useCart"
import { useCartSocket } from "@/features/menu/hooks/useCartSocket"
import { useGuestAuth } from "@/features/menu/hooks/useGuestAuth"
import { useItemLikes } from "@/features/menu/hooks/useItemLikes"
import { useMenuPage } from "@/features/menu/hooks/useMenuPage"
import { useMenuStrings } from "@/features/menu/strings"
import { formatAmount, getCurrencySymbol } from "@/features/menu/utils"
import type { MenuItem } from "@/features/menu/types"
import "./MenuPage.css"

function MenuPage() {
  const menuStrings = useMenuStrings()
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get("reservation") ?? undefined
  const tableId = searchParams.get("table") ?? undefined
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartBarDismissed, setCartBarDismissed] = useState(false)
  const [cartAccessError, setCartAccessError] = useState<string | null>(null)
  const [allergenFilterOpen, setAllergenFilterOpen] = useState(false)
  const [scrollActiveCategory, setScrollActiveCategory] = useState<string | null>(null)
  const pendingScrollCategory = useRef<string | null>(null)
  const [lobbyName, setLobbyName] = useState("")
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const stickyControlsRef = useRef<HTMLDivElement>(null)
  const allergenFilterRef = useRef<HTMLDivElement>(null)
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()

  const handleSignOut = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" })
    } finally {
      dispatch(clearAuth())
    }
  }, [dispatch])

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
    ingredientSearch,
    setIngredientSearch,
    allergenOptions,
    selectedAllergens,
    toggleAllergen,
    sortOrder,
    setSortOrder,
    setItemLikeState,
    error,
  } = useMenuPage(restaurantId ?? "", guestAuth.deviceId)

  // Show the restaurant's own name in the browser tab instead of the generic default.
  useEffect(() => {
    if (!restaurantName) return
    const previousTitle = document.title
    document.title = restaurantName
    return () => {
      document.title = previousTitle
    }
  }, [restaurantName])

  useEffect(() => {
    if (!allergenFilterOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!allergenFilterRef.current?.contains(event.target as Node)) {
        setAllergenFilterOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [allergenFilterOpen])

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
    changeQuantity,
    removeItem,
    syncFromServer,
    clearError,
  } = useCart({
    cartSessionId: guestAuth.cartSessionId,
    guestJwt: guestAuth.guestJwt,
    itemsById,
    reserved: guestAuth.status === "ready",
    onAuthError: guestAuth.initialize,
  })

  const bill = useBill({
    cartSessionId: guestAuth.cartSessionId,
    guestJwt: guestAuth.guestJwt,
  })
  const refreshBill = bill.refresh

  // A cart_updated push can mean another guest just paid, so refresh the bill too.
  const handleCartUpdated = useCallback(() => {
    syncFromServer()
    refreshBill()
  }, [syncFromServer, refreshBill])

  // Destructure the stable fields so the callback deps are these values, not
  // the whole guestAuth object (which is a fresh object every render).
  const { cartSessionId, guestJwt, initialize: reinitGuestCart } = guestAuth
  const handleCheckout = useCallback(async () => {
    if (!cartSessionId || !guestJwt) {
      return Promise.reject(new Error(menuStrings.cart.sessionUnavailable))
    }
    const result = await checkout(cartSessionId, guestJwt)
    // Checkout closed this cart; reopen a fresh one so the guest can order again.
    reinitGuestCart()
    return result
  }, [cartSessionId, guestJwt, reinitGuestCart])

  const { isConnected, sessionExpired } = useCartSocket({
    cartSessionId: guestAuth.cartSessionId,
    guestJwt: guestAuth.guestJwt,
    onCartUpdated: handleCartUpdated,
    onAuthExpired: guestAuth.initialize,
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
    guestAuth.deviceId,
    handleLiked,
  )

  // Group by category only in the default order. A price sort is global, so the
  // first page holds the cheapest items and whole (e.g. seafood) categories would
  // render empty until more pages load — making dishes look "deleted". When
  // sorting by price we show one flat, price-ordered list instead.
  const showAllGrouped =
    activeCategory === null &&
    !ingredientSearch &&
    selectedAllergens.length === 0 &&
    sortOrder === "sort_order"

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

  const pendingItemIds = useMemo(
    () =>
      new Set(
        Array.isArray(cartItems)
          ? cartItems.filter((c) => c.id.startsWith("temp-")).map((c) => c.menuItemId)
          : [],
      ),
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

  const scrollToCategory = useCallback((id: string) => {
    const el = sectionRefs.current.get(id)
    if (!el) return false
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    return true
  }, [])

  const handleCategorySelect = (id: string | null) => {
    if (id === null) {
      setActiveCategory(null)
      setScrollActiveCategory(null)
      pendingScrollCategory.current = null
    } else if (showAllGrouped) {
      // The section may not be rendered yet because its items are still
      // behind pagination. If so, remember it and load more until it appears.
      if (!scrollToCategory(id)) {
        pendingScrollCategory.current = id
        if (hasMore && !loadingMore) loadMore()
      }
    } else {
      setActiveCategory(id)
    }
  }

  // Keep loading pages until the pending category's section exists, then scroll.
  // Each page load updates groupedItems, which re-runs this effect.
  useEffect(() => {
    const target = pendingScrollCategory.current
    if (!target) return
    const catItems = groupedItems?.get(target)
    if (catItems && catItems.length > 0 && scrollToCategory(target)) {
      pendingScrollCategory.current = null
    } else if (hasMore) {
      if (!loadingMore) loadMore()
    } else {
      pendingScrollCategory.current = null
    }
  }, [groupedItems, hasMore, loadingMore, loadMore, scrollToCategory])

  const handleAddToCart = useCallback(
    (item: MenuItem, comment?: string) => {
      if (guestAuth.status === "loading" || guestAuth.status === "init") {
        setCartAccessError(menuStrings.cart.initializing)
        setCartOpen(true)
        return
      }
      if (!reservationId && !tableId) {
        setCartAccessError(menuStrings.cart.requiresActiveTable)
        setCartOpen(true)
        return
      }
      if (!guestAuth.guestJwt || !guestAuth.cartSessionId) {
        setCartAccessError(guestAuth.error ?? menuStrings.cart.sessionUnavailable)
        setCartOpen(true)
        return
      }
      setCartAccessError(null)
      addItem(item.public_id, comment)
    },
    [
      addItem,
      guestAuth.cartSessionId,
      guestAuth.error,
      guestAuth.guestJwt,
      guestAuth.status,
      reservationId,
      tableId,
    ],
  )

  // Keep the latest cart in a ref so handleChangeQuantity stays referentially
  // stable across quantity changes — otherwise every +/- would rebuild it and
  // re-render every (memoized) card.
  const cartItemsRef = useRef(cartItems)
  useEffect(() => {
    cartItemsRef.current = cartItems
  }, [cartItems])

  const handleChangeQuantity = useCallback(
    (itemId: string, delta: number) => {
      const cartItem = cartItemsRef.current.find(
        (ci) => ci.menuItemId === itemId || ci.id === itemId,
      )
      if (!cartItem) return
      changeQuantity(cartItem.id, delta)
    },
    [changeQuantity],
  )

  // The cart bar can be dismissed (swipe down / ✕). Bring it back when the cart
  // grows again so a new item is never hidden.
  const prevTotalCount = useRef(totalCount)
  useEffect(() => {
    if (totalCount > prevTotalCount.current) setCartBarDismissed(false)
    prevTotalCount.current = totalCount
  }, [totalCount])

  const cartBarTouchStartY = useRef<number | null>(null)
  // A swipe ends in a synthesized click; this flag lets onClick ignore it so a
  // dismiss gesture doesn't also open the cart.
  const cartBarSwiped = useRef(false)
  const handleCartBarTouchStart = (e: TouchEvent) => {
    cartBarTouchStartY.current = e.touches[0].clientY
  }
  const handleCartBarTouchEnd = (e: TouchEvent) => {
    const start = cartBarTouchStartY.current
    cartBarTouchStartY.current = null
    if (start !== null && e.changedTouches[0].clientY - start > 40) {
      cartBarSwiped.current = true
      setCartBarDismissed(true)
    }
  }
  const handleCartBarClick = () => {
    if (cartBarSwiped.current) {
      cartBarSwiped.current = false
      return
    }
    setCartOpen(true)
  }

  const showCartBar = totalCount > 0 && !cartBarDismissed

  // The swipe sets cartBarSwiped to suppress the trailing synthetic click. When
  // the swipe dismisses the bar, it unmounts before that click arrives, so the
  // flag stays set and would swallow the first real tap after the bar returns.
  // Clear it whenever the bar reappears.
  useEffect(() => {
    if (showCartBar) cartBarSwiped.current = false
  }, [showCartBar])

  // The controls row (search/sort/cart/categories) is sticky at the top. Expose
  // its live height so the sticky "About" panel can sit right below it instead
  // of being covered.
  useEffect(() => {
    const el = stickyControlsRef.current
    if (!el) return
    const update = () =>
      document.documentElement.style.setProperty("--menu-sticky-h", `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const railActiveCategory = showAllGrouped ? scrollActiveCategory : activeCategory
  const currencySymbol = restaurantSettings ? getCurrencySymbol(restaurantSettings.currency) : ""
  const totalPriceLabel = formatAmount(totalPrice)

  const gridHandlers = {
    currencySymbol,
    cartQuantities,
    pendingItemIds,
    isLikePending,
    onSelect: setSelectedItem,
    onAddToCart: handleAddToCart,
    onToggleLike: toggleLike,
    onChangeQuantity: handleChangeQuantity,
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
    <div className="menu-page__load-more-wrap">
      <button
        className="menu-page__load-more"
        onClick={loadMore}
        disabled={loadingMore}
        aria-busy={loadingMore}
      >
        {loadingMore ? (
          <>
            <LuLoaderCircle className="menu-page__load-more-spinner" size={16} aria-hidden="true" />
            {menuStrings.grid.loadingMore}
          </>
        ) : (
          <>
            {menuStrings.grid.loadMore}
            <LuArrowDown size={15} aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  ) : null

  return (
    <main className={`menu-page${showCartBar ? " menu-page--has-cart-bar" : ""}`}>
      <MenuHeader
        name={restaurantName}
        coverImage={restaurantCoverImage}
        settings={restaurantSettings}
        user={user}
        restaurantId={restaurantId}
        onSignOut={handleSignOut}
      />

      <div className="menu-page__sticky-controls" ref={stickyControlsRef}>
        <div className="menu-page__searchrow">
          <input
            className="menu-page__search"
            type="search"
            placeholder={menuStrings.controls.searchPlaceholder}
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
          />
          <select
            className="menu-page__sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            aria-label={menuStrings.controls.sortAria}
          >
            <option value="sort_order">{menuStrings.controls.sortRecommended}</option>
            <option value="-likes_count">{menuStrings.controls.sortPopular}</option>
            <option value="price">{menuStrings.controls.sortPriceAsc}</option>
            <option value="-price">{menuStrings.controls.sortPriceDesc}</option>
          </select>
          <button
            className="menu-page__cart-btn"
            onClick={() => setCartOpen(true)}
            aria-label={menuStrings.controls.cartAria}
          >
            <LuShoppingCart size={18} />
            {totalCount > 0 && (
              <span key={totalCount} className="menu-page__cart-badge">
                {totalCount}
              </span>
            )}
          </button>
        </div>
        {allergenOptions.length > 0 && (
          <div className="menu-page__allergen-filter" ref={allergenFilterRef}>
            <button
              type="button"
              className={`menu-page__allergen-filter-toggle${selectedAllergens.length ? " menu-page__allergen-filter-toggle--active" : ""}`}
              aria-expanded={allergenFilterOpen}
              aria-controls="allergen-filter-panel"
              onClick={() => setAllergenFilterOpen((open) => !open)}
            >
              {menuStrings.controls.excludeAllergens(selectedAllergens.length)}
            </button>
            {allergenFilterOpen && (
              <div
                id="allergen-filter-panel"
                className="menu-page__allergen-filter-panel"
                role="dialog"
                aria-label={menuStrings.controls.allergensAria}
              >
                <p className="menu-page__allergen-filter-title">
                  {menuStrings.controls.excludeAllergensTitle}
                </p>
                <p className="menu-page__allergen-filter-description">
                  {menuStrings.controls.excludeAllergensDescription}
                </p>
                <div className="menu-page__allergen-filters">
                  {allergenOptions.map((allergen) => {
                    const selected = selectedAllergens.includes(allergen)
                    return (
                      <button
                        key={allergen}
                        type="button"
                        className={`menu-page__allergen-chip${selected ? " menu-page__allergen-chip--selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => toggleAllergen(allergen)}
                      >
                        {allergen}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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
            <MenuEmptyState message={menuStrings.grid.noDishesFound} />
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
          telegramUrl={restaurantTelegramUrl}
          facebookUrl={restaurantFacebookUrl}
        />
      </div>

      <MenuFooter restaurantName={restaurantName} />

      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {showCartBar && !selectedItem && (
        <div
          className="menu-page__cart-bar"
          onTouchStart={handleCartBarTouchStart}
          onTouchEnd={handleCartBarTouchEnd}
        >
          <span className="menu-page__cart-bar-grabber" aria-hidden="true" />
          <button
            type="button"
            className="menu-page__cart-bar-open"
            onClick={handleCartBarClick}
            aria-label={menuStrings.cartBar.openAria}
          >
            <span className="menu-page__cart-bar-summary">{`${menuStrings.cartBar.items(totalCount)} · ${totalPriceLabel} ${currencySymbol}`}</span>
            <span className="menu-page__cart-bar-action">{menuStrings.cartBar.action}</span>
          </button>
          <button
            type="button"
            className="menu-page__cart-bar-close"
            onClick={(e) => {
              e.stopPropagation()
              setCartBarDismissed(true)
            }}
            aria-label={menuStrings.cartBar.dismiss}
          >
            <LuX size={16} />
          </button>
        </div>
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
          sessionExpired={sessionExpired}
          showConnectionStatus={Boolean(guestAuth.cartSessionId && guestAuth.guestJwt)}
          error={cartAccessError ?? cartError}
          errorItemId={errorItemId}
          displayName={guestAuth.displayName}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={removeItem}
          onClose={() => setCartOpen(false)}
          onClearError={() => {
            setCartAccessError(null)
            clearError()
          }}
          onRetry={cartAccessError ? undefined : syncFromServer}
          onCheckout={handleCheckout}
          billItems={bill.items}
          billLoading={bill.loading}
          onLoadBill={bill.refresh}
          onPayBill={bill.pay}
          onCartChanged={syncFromServer}
        />
      )}
    </main>
  )
}

export default MenuPage
