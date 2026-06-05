import { useMemo, useState } from "react"
import { LuPlus, LuExternalLink } from "react-icons/lu"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useAppSelector } from "@/store/hooks"
import { useMenuAdmin } from "../hooks/useMenuAdmin"
import { useDndSensors } from "../components/useDndSensors"
import SearchBox from "../components/SearchBox"
import EmptyState from "../components/EmptyState"
import AddMenuModal from "../components/AddMenuModal"
import MenuToolbar from "../components/MenuToolbar"
import CategoryRow from "../components/CategoryRow"
import AddCategoryForm from "../components/AddCategoryForm"
import DishList from "../components/DishList"
import DishModal from "../components/DishModal"
import ConfirmDialog from "../components/ConfirmDialog"
import type { AdminMenuItem } from "../types"
import "../components/SectionPlaceholder.css"
import "../components/menu.css"

// Sentinel for the "No category" option in the bulk-move dropdown.
const UNCATEGORIZED = "__none__"

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
  const [dishModal, setDishModal] = useState<{ open: boolean; item: AdminMenuItem | null }>({
    open: false,
    item: null,
  })
  const restaurantId = useAppSelector((s) => s.auth.user?.restaurantId ?? null)
  const sensors = useDndSensors()
  const [dishQuery, setDishQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const filteredItems = useMemo(() => {
    const q = dishQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.name.toLowerCase().includes(q))
  }, [items, dishQuery])

  // Selection acts only on the dishes currently in view (respects search).
  const selectedVisibleIds = useMemo(
    () => filteredItems.filter((it) => selectedIds.has(it.public_id)).map((it) => it.public_id),
    [filteredItems, selectedIds],
  )
  const allSelected = filteredItems.length > 0 && selectedVisibleIds.length === filteredItems.length

  const clearSelection = () => setSelectedIds(new Set())

  const toggleSelect = (publicId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(publicId)) next.delete(publicId)
      else next.add(publicId)
      return next
    })

  const toggleSelectAll = () => {
    if (allSelected) clearSelection()
    else setSelectedIds(new Set(filteredItems.map((it) => it.public_id)))
  }

  const runBulk = (fn: () => void) => {
    fn()
    clearSelection()
  }

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
                onClick={() => {
                  selectMenu(m.public_id)
                  clearSelection()
                }}
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

                <section className="menu-admin__col">
                  <div className="menu-admin__dishes-head">
                    <h2 className="menu-admin__subtitle">Dishes</h2>
                    <button
                      type="button"
                      className="menu-admin__btn"
                      onClick={() => setDishModal({ open: true, item: null })}
                    >
                      <LuPlus aria-hidden="true" />
                      <span>Add dish</span>
                    </button>
                  </div>
                  {loadingItems ? (
                    <p className="admin-section__description">Loading…</p>
                  ) : items.length === 0 ? (
                    <EmptyState
                      message="No dishes in this menu yet."
                      actionLabel="Add dish"
                      onAction={() => setDishModal({ open: true, item: null })}
                    />
                  ) : (
                    <>
                      <SearchBox
                        value={dishQuery}
                        onChange={setDishQuery}
                        placeholder="Search dishes"
                        ariaLabel="Search dishes"
                      />
                      {filteredItems.length === 0 ? (
                        <p className="admin-section__description">
                          No dishes match “{dishQuery.trim()}”.
                        </p>
                      ) : (
                        <>
                          <div className="menu-admin__select-bar">
                            <label className="menu-admin__select-all">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                              />
                              <span>
                                {selectedVisibleIds.length > 0
                                  ? `${selectedVisibleIds.length} selected`
                                  : "Select all"}
                              </span>
                            </label>

                            {selectedVisibleIds.length > 0 && (
                              <div className="menu-admin__bulk-actions">
                                <button
                                  type="button"
                                  className="menu-admin__btn"
                                  onClick={() =>
                                    runBulk(() => bulkSetAvailable(selectedVisibleIds, true))
                                  }
                                >
                                  Show
                                </button>
                                <button
                                  type="button"
                                  className="menu-admin__btn"
                                  onClick={() =>
                                    runBulk(() => bulkSetAvailable(selectedVisibleIds, false))
                                  }
                                >
                                  Hide
                                </button>
                                <select
                                  className="admin-field__input menu-admin__bulk-move"
                                  value=""
                                  aria-label="Move selected dishes to category"
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (!value) return
                                    runBulk(() =>
                                      bulkSetCategory(
                                        selectedVisibleIds,
                                        value === UNCATEGORIZED ? null : value,
                                      ),
                                    )
                                  }}
                                >
                                  <option value="">Move to…</option>
                                  <option value={UNCATEGORIZED}>No category</option>
                                  {categories.map((c) => (
                                    <option key={c.public_id} value={c.public_id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="menu-admin__btn menu-admin__btn--danger"
                                  onClick={() => setConfirmBulkDelete(true)}
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  className="menu-admin__btn"
                                  onClick={clearSelection}
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>

                          <DishList
                            items={filteredItems}
                            categories={categories}
                            onEdit={(item) => setDishModal({ open: true, item })}
                            onReorder={reorderItem}
                            reorderDisabled={dishQuery.trim() !== ""}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                          />
                        </>
                      )}
                    </>
                  )}
                </section>
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

      {dishModal.open && selectedMenu && (
        <DishModal
          menuId={selectedMenu.public_id}
          categories={categories}
          item={dishModal.item}
          onClose={() => setDishModal({ open: false, item: null })}
          onSaved={reloadItems}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Delete dishes"
          message={`Delete ${selectedVisibleIds.length} selected dish${
            selectedVisibleIds.length === 1 ? "" : "es"
          }? This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            setConfirmBulkDelete(false)
            runBulk(() => bulkDelete(selectedVisibleIds))
          }}
          onClose={() => setConfirmBulkDelete(false)}
        />
      )}
    </section>
  )
}

export default MenuSection
