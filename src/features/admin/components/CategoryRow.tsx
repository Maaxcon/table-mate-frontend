import { useState } from "react"
import { LuGripVertical, LuTrash2 } from "react-icons/lu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteCategory, updateCategory } from "../menuApi"
import type { AdminCategory } from "../types"
import ConfirmDialog from "./ConfirmDialog"
import { useToast } from "./toastContext"

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

  const handleRename = () => {
    if (!name.trim() || name.trim() === category.name) return
    void run(
      () => updateCategory(category.public_id, { name: name.trim() }),
      onChanged,
      "Category renamed",
    )
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
      <button
        type="button"
        className="menu-admin__drag"
        aria-label={`Drag to reorder category ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <LuGripVertical aria-hidden="true" />
      </button>
      <input
        className="admin-field__input menu-admin__row-input"
        value={name}
        disabled={busy}
        aria-label="Category name"
        onChange={(e) => setName(e.target.value)}
        onBlur={handleRename}
      />
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--primary"
        disabled={busy || !name.trim() || name.trim() === category.name}
        onClick={handleRename}
      >
        Save
      </button>
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--danger"
        disabled={busy}
        onClick={() => setConfirmDelete(true)}
        aria-label="Delete category"
      >
        <LuTrash2 aria-hidden="true" />
      </button>

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
