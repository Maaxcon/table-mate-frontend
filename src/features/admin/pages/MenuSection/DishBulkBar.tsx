import type { AdminCategory } from "@/features/admin/types"

// Sentinel for the "No category" option in the move dropdown.
const UNCATEGORIZED = "__none__"

type DishBulkBarProps = {
  selectedCount: number
  allSelected: boolean
  categories: AdminCategory[]
  onToggleSelectAll: () => void
  onShow: () => void
  onHide: () => void
  onMove: (category: string | null) => void
  onDelete: () => void
  onClear: () => void
}

/** Select-all + bulk actions row shown above the dish grid. */
function DishBulkBar({
  selectedCount,
  allSelected,
  categories,
  onToggleSelectAll,
  onShow,
  onHide,
  onMove,
  onDelete,
  onClear,
}: DishBulkBarProps) {
  return (
    <div className="menu-admin__select-bar">
      <label className="menu-admin__select-all">
        <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
        <span>{selectedCount > 0 ? `${selectedCount} selected` : "Select all"}</span>
      </label>

      {selectedCount > 0 && (
        <div className="menu-admin__bulk-actions">
          <button type="button" className="menu-admin__btn" onClick={onShow}>
            Show
          </button>
          <button type="button" className="menu-admin__btn" onClick={onHide}>
            Hide
          </button>
          <select
            className="admin-field__input menu-admin__bulk-move"
            value=""
            aria-label="Move selected dishes to category"
            onChange={(e) => {
              const value = e.target.value
              if (value) onMove(value === UNCATEGORIZED ? null : value)
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
            onClick={onDelete}
          >
            Delete
          </button>
          <button type="button" className="menu-admin__btn" onClick={onClear}>
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default DishBulkBar
