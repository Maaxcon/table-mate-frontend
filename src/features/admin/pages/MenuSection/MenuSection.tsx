import { useState } from "react"
import { LuPlus, LuExternalLink } from "react-icons/lu"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useAppSelector } from "@/store/hooks"
import { useMenuAdmin } from "../../hooks/useMenuAdmin"
import { useDndSensors } from "../../hooks/useDndSensors"
import EmptyState from "../../components/EmptyState"
import AddMenuModal from "../../components/AddMenuModal"
import MenuToolbar from "../../components/MenuToolbar"
import CategoryRow from "../../components/CategoryRow"
import AddCategoryForm from "../../components/AddCategoryForm"
import DishesColumn from "./DishesColumn"
import "../../components/styles/SectionPlaceholder.css"
import "../../components/styles/menu.css"

function MenuSection() {
  const {
    menus,
    selectedMenuId,
    selectMenu,
    categories,
    items,
    loadingMenus,
    loadingCategories,
    loadingItems,
    error,
    reloadMenus,
    reloadCategories,
    reloadItems,
    reorderCategory,
    reorderItem,
    bulkSetAvailable,
    bulkSetCategory,
    bulkDelete,
  } = useMenuAdmin()
  const [addingMenu, setAddingMenu] = useState(false)
  const restaurantId = useAppSelector((s) => s.auth.user?.restaurantId ?? null)
  const sensors = useDndSensors()

  const handleCategoryDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) reorderCategory(String(active.id), String(over.id))
  }

  const selectedMenu = menus.find((m) => m.public_id === selectedMenuId) ?? null

  return (
    <section className="admin-section admin-section--wide">
      <header className="admin-section__header menu-admin__page-head">
        <div>
          <h1 className="admin-section__title">Menu</h1>
          <p className="admin-section__description">Manage menus, categories, and dishes.</p>
        </div>
        {restaurantId && (
          <a
            className="menu-admin__view-btn"
            href={`/menu/${restaurantId}`}
            target="_blank"
            rel="noreferrer"
          >
            <LuExternalLink aria-hidden="true" />
            <span>View menu</span>
          </a>
        )}
      </header>

      {error && <p className="menu-admin__error">{error}</p>}

      {loadingMenus ? (
        <p className="admin-section__description">Loading…</p>
      ) : (
        <>
          <div className="menu-admin__menus">
            {menus.map((m) => (
              <button
                key={m.public_id}
                type="button"
                className={`menu-admin__tab${
                  m.public_id === selectedMenuId ? " menu-admin__tab--active" : ""
                }`}
                onClick={() => selectMenu(m.public_id)}
              >
                {m.name}
                {!m.is_active && <span className="menu-admin__tab-badge">hidden</span>}
              </button>
            ))}
            <button
              type="button"
              className="menu-admin__tab menu-admin__tab--add"
              onClick={() => setAddingMenu(true)}
            >
              <LuPlus aria-hidden="true" />
              <span>Add menu</span>
            </button>
          </div>

          {selectedMenu && (
            <MenuToolbar
              key={selectedMenu.public_id}
              menu={selectedMenu}
              onChanged={reloadMenus}
              onDeleted={reloadMenus}
            />
          )}

          {menus.length === 0 ? (
            <EmptyState
              message="No menus yet. Add one to start."
              actionLabel="Add menu"
              onAction={() => setAddingMenu(true)}
            />
          ) : (
            selectedMenu && (
              <div className="menu-admin__columns">
                <section className="menu-admin__col">
                  <h2 className="menu-admin__subtitle">Categories</h2>
                  {loadingCategories ? (
                    <p className="admin-section__description">Loading…</p>
                  ) : (
                    <>
                      {categories.length === 0 ? (
                        <p className="admin-section__description">
                          No categories in this menu yet.
                        </p>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleCategoryDragEnd}
                        >
                          <SortableContext
                            items={categories.map((c) => c.public_id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <ul className="menu-admin__list">
                              {categories.map((c) => (
                                <CategoryRow
                                  key={c.public_id}
                                  category={c}
                                  onChanged={reloadCategories}
                                  onDeleted={reloadCategories}
                                />
                              ))}
                            </ul>
                          </SortableContext>
                        </DndContext>
                      )}
                      <AddCategoryForm
                        menuId={selectedMenu.public_id}
                        onCreated={reloadCategories}
                      />
                    </>
                  )}
                </section>

                <DishesColumn
                  key={selectedMenu.public_id}
                  menuId={selectedMenu.public_id}
                  items={items}
                  categories={categories}
                  loading={loadingItems}
                  onReorder={reorderItem}
                  onSaved={reloadItems}
                  bulkSetAvailable={bulkSetAvailable}
                  bulkSetCategory={bulkSetCategory}
                  bulkDelete={bulkDelete}
                />
              </div>
            )
          )}
        </>
      )}

      {addingMenu && (
        <AddMenuModal
          onClose={() => setAddingMenu(false)}
          onCreated={(menu) => {
            selectMenu(menu.public_id)
            reloadMenus()
          }}
        />
      )}
    </section>
  )
}

export default MenuSection
