import { useRef, useState } from "react"
import { LuGripVertical, LuTrash2 } from "react-icons/lu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteCategory, updateCategory } from "@/features/admin/api/menu"
import type { AdminCategory } from "@/features/admin/types"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import { useToast } from "@/features/admin/hooks/toastContext"
import { DEFAULT_CATEGORY_COLOR } from "@/features/admin/constants/menu"

type CategoryRowProps = {
  category: AdminCategory
  onChanged: () => void
  onDeleted: () => void
}

// Relies on a `key={category.public_id}` in the parent to re-init the input.
function CategoryRow({ category, onChanged, onDeleted }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.public_id,
  })
  const toast = useToast()
  const [name, setName] = useState(category.name)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [color, setColor] = useState(category.color ?? DEFAULT_CATEGORY_COLOR)
  const [colorEnabled, setColorEnabled] = useState(Boolean(category.color))
  const colorInputRef = useRef<HTMLInputElement | null>(null)

  const run = async (action: () => Promise<unknown>, after: () => void, successMsg: string) => {
    setBusy(true)
    try {
      await action()
      after()
      toast.success(successMsg)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  const trimmedName = name.trim()
  const nextColor = colorEnabled ? color.toUpperCase() : null
  const nameChanged = Boolean(trimmedName) && trimmedName !== category.name
  const colorChanged = (nextColor ?? null) !== (category.color ?? null)
  const nameInvalid = !trimmedName && name !== category.name
  const canSave = (nameChanged || colorChanged) && !nameInvalid

  const saveChanges = () => {
    const trimmedName = name.trim()
    const nextColor = colorEnabled ? color.toUpperCase() : null
    const patch: Partial<Pick<AdminCategory, "name" | "color">> = {}

    if (trimmedName && trimmedName !== category.name) {
      patch.name = trimmedName
    }

    if ((nextColor ?? null) !== (category.color ?? null)) {
      patch.color = nextColor
    }

    if (Object.keys(patch).length === 0) {
      if (!trimmedName) {
        setName(category.name)
      }
      return
    }

    void run(() => updateCategory(category.public_id, patch), onChanged, "Category updated")
  }

  const confirmDeleteAction = async () => {
    await run(() => deleteCategory(category.public_id), onDeleted, "Category deleted")
    setConfirmDelete(false)
  }

  return (
    <li
      ref={setNodeRef}
      className="menu-admin__row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <div className="menu-admin__row-drag">
        <button
          type="button"
          className="menu-admin__drag"
          aria-label={`Drag to reorder category ${category.name}`}
          {...attributes}
          {...listeners}
        >
          <LuGripVertical aria-hidden="true" />
        </button>
      </div>
      <div className="menu-admin__row-body">
        <div className="menu-admin__row-top">
          <input
            className="admin-field__input menu-admin__row-input"
            value={name}
            disabled={busy}
            aria-label="Category name"
            onChange={(e) => setName(e.target.value)}
            onBlur={saveChanges}
          />
        </div>
        <div className="menu-admin__row-bottom">
          <div className="menu-admin__color-controls">
            <button
              type="button"
              className={`menu-admin__color-swatch ${colorEnabled ? "" : "is-disabled"}`}
              style={{ backgroundColor: colorEnabled ? color : "transparent" }}
              aria-label={
                colorEnabled
                  ? `Change color for ${category.name}`
                  : `Set color for ${category.name}`
              }
              disabled={busy}
              onClick={() => {
                if (busy) return
                if (!colorEnabled) setColorEnabled(true)
                colorInputRef.current?.click()
              }}
            />
            <input
              ref={colorInputRef}
              type="color"
              className="menu-admin__color-picker"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
            <button
              type="button"
              className="menu-admin__btn menu-admin__btn--primary menu-admin__color-clear"
              disabled={busy || !colorEnabled}
              onClick={() => {
                if (!colorEnabled || busy) return
                setColorEnabled(false)
                setColor(DEFAULT_CATEGORY_COLOR)
              }}
            >
              Clear
            </button>
          </div>
          <div className="menu-admin__row-bottom-actions">
            <button
              type="button"
              className="menu-admin__btn menu-admin__btn--danger"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete category"
            >
              <LuTrash2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="menu-admin__btn menu-admin__btn--primary menu-admin__row-save"
              disabled={busy || !canSave}
              onClick={saveChanges}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete category"
          message={`Delete category "${category.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          onConfirm={() => void confirmDeleteAction()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </li>
  )
}

export default CategoryRow
