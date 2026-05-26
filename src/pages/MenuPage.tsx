import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import logo from "@/assets/logo.png"
import { useAppSelector } from "@/store/hooks"
import {
  CategoryRail,
  MenuEmptyState,
  MenuItemCard,
  MenuItemModal,
  MenuSkeleton,
  RestaurantInfoPanel,
} from "@/features/menu/components"
import { useMenuPage } from "@/features/menu/hooks/useMenuPage"
import type { MenuItem } from "@/types/menu"
import "./MenuPage.css"

function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const user = useAppSelector((s) => s.auth.user)

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
    error,
  } = useMenuPage(restaurantId ?? "")

  if (!restaurantId) {
    return (
      <main className="menu-page">
        <p className="menu-page__error">Restaurant not found.</p>
      </main>
    )
  }

  return (
    <main className="menu-page">
      <header className="menu-page__header">
        <div className="menu-page__topbar">
          <img src={logo} alt="TableMate" className="menu-page__logo" />
          <div className="menu-page__topbar-right">
            <input
              className="menu-page__search"
              type="search"
              placeholder="Search dishes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
        <div className="menu-page__titlerow">
          <div>
            <p className="menu-page__label">Menu</p>
            <h1 className="menu-page__title">{restaurantName ?? "—"}</h1>
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
                  <MenuItemCard key={item.public_id} item={item} onClick={setSelectedItem} />
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

      {selectedItem && <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </main>
  )
}

export default MenuPage
