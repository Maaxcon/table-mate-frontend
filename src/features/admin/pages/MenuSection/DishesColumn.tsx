import { useMemo, useState } from "react"
import { LuPlus } from "react-icons/lu"
import type { AdminCategory, AdminMenuItem } from "../../types"
import SearchBox from "../../components/SearchBox"
import EmptyState from "../../components/EmptyState"
import DishList from "../../components/DishList"
import DishModal from "../../components/DishModal"
import ConfirmDialog from "../../components/ConfirmDialog"
import DishBulkBar from "./DishBulkBar"

type SortBy = "manual" | "name" | "price-asc" | "price-desc"

type DishesColumnProps = {
  menuId: string
  items: AdminMenuItem[]
  categories: AdminCategory[]
  loading: boolean
  onReorder: (activeId: string, overId: string) => void
  onSaved: () => void
  bulkSetAvailable: (ids: string[], isAvailable: boolean) => void
  bulkSetCategory: (ids: string[], category: string | null) => void
  bulkDelete: (ids: string[]) => void
}

/**
 * The dishes column of the menu admin: search + sort, selection + bulk actions,
 * the dish grid, and the add/edit dish modal. Owns its own view state; mount it
 * with `key={menuId}` so switching menus resets search/sort/selection.
 */
function DishesColumn({
  menuId,
  items,
  categories,
  loading,
  onReorder,
  onSaved,
  bulkSetAvailable,
  bulkSetCategory,
  bulkDelete,
}: DishesColumnProps) {
  const [dishQuery, setDishQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("manual")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [dishModal, setDishModal] = useState<{ open: boolean; item: AdminMenuItem | null }>({
    open: false,
    item: null,
  })

  const filteredItems = useMemo(() => {
    const q = dishQuery.trim().toLowerCase()
    const base =
      q === ""
        ? items
        : // Search across name, description, and ingredients.
          items.filter((it) =>
            [it.name, it.description ?? "", ...(it.ingredients ?? [])]
              .join(" ")
              .toLowerCase()
              .includes(q),
          )
    if (sortBy === "manual") return base
    const sorted = [...base]
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === "price-asc") sorted.sort((a, b) => Number(a.price) - Number(b.price))
    else if (sortBy === "price-desc") sorted.sort((a, b) => Number(b.price) - Number(a.price))
    return sorted
  }, [items, dishQuery, sortBy])

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

  return (
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

      {loading ? (
        <p className="admin-section__description">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          message="No dishes in this menu yet."
          actionLabel="Add dish"
          onAction={() => setDishModal({ open: true, item: null })}
        />
      ) : (
        <>
          <div className="menu-admin__dishes-toolbar">
            <SearchBox
              value={dishQuery}
              onChange={setDishQuery}
              placeholder="Search by name, description, ingredient"
              ariaLabel="Search dishes"
            />
            <select
              className="admin-field__input menu-admin__sort"
              value={sortBy}
              aria-label="Sort dishes"
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="manual">Manual order</option>
              <option value="name">Name (A–Z)</option>
              <option value="price-asc">Price (low–high)</option>
              <option value="price-desc">Price (high–low)</option>
            </select>
          </div>

          {filteredItems.length === 0 ? (
            <p className="admin-section__description">No dishes match “{dishQuery.trim()}”.</p>
          ) : (
            <>
              <DishBulkBar
                selectedCount={selectedVisibleIds.length}
                allSelected={allSelected}
                categories={categories}
                onToggleSelectAll={toggleSelectAll}
                onShow={() => runBulk(() => bulkSetAvailable(selectedVisibleIds, true))}
                onHide={() => runBulk(() => bulkSetAvailable(selectedVisibleIds, false))}
                onMove={(category) => runBulk(() => bulkSetCategory(selectedVisibleIds, category))}
                onDelete={() => setConfirmBulkDelete(true)}
                onClear={clearSelection}
              />

              <DishList
                items={filteredItems}
                categories={categories}
                onEdit={(item) => setDishModal({ open: true, item })}
                onToggleAvailable={(item) => bulkSetAvailable([item.public_id], !item.is_available)}
                onReorder={onReorder}
                reorderDisabled={dishQuery.trim() !== "" || sortBy !== "manual"}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            </>
          )}
        </>
      )}

      {dishModal.open && (
        <DishModal
          menuId={menuId}
          categories={categories}
          item={dishModal.item}
          onClose={() => setDishModal({ open: false, item: null })}
          onSaved={onSaved}
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

export default DishesColumn
