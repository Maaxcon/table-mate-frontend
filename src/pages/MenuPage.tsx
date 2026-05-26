import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  CategoryRail,
  MenuEmptyState,
  MenuItemCard,
  MenuItemModal,
  MenuSkeleton,
} from "@/features/menu/components"
import { useMenuPage } from "@/features/menu/hooks/useMenuPage"
import type { MenuItem } from "@/types/menu"
import "./MenuPage.css"

function MenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  const {
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
        <h1 className="menu-page__title">Menu</h1>
        <input
          className="menu-page__search"
          type="search"
          placeholder="Search dishes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </header>

      <CategoryRail
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        loading={categoriesLoading}
      />

      {error && <p className="menu-page__error">{error}</p>}

      {itemsLoading ? (
        <MenuSkeleton count={6} />
      ) : items.length === 0 ? (
        <MenuEmptyState
          message={searchQuery ? `No results for "${searchQuery}".` : "No items in this category."}
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

      {selectedItem && <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </main>
  )
}

export default MenuPage
