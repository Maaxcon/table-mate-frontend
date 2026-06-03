import { useState } from "react"
import { LuTrash2 } from "react-icons/lu"
import { deleteCategory, updateCategory } from "../menuApi"
import type { AdminCategory } from "../types"

type CategoryRowProps = {
  category: AdminCategory
  onChanged: () => void
  onDeleted: () => void
}

// Relies on a `key={category.public_id}` in the parent to re-init the input.
function CategoryRow({ category, onChanged, onDeleted }: CategoryRowProps) {
  const [name, setName] = useState(category.name)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true)
    try {
      await action()
      after()
    } finally {
      setBusy(false)
    }
  }

  const handleRename = () => {
    if (!name.trim() || name.trim() === category.name) return
    void run(() => updateCategory(category.public_id, { name: name.trim() }), onChanged)
  }

  const handleDelete = () => {
    const ok = window.confirm(`Delete category "${category.name}"?`)
    if (ok) void run(() => deleteCategory(category.public_id), onDeleted)
  }

  return (
    <li className="menu-admin__row">
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
        className="menu-admin__btn"
        disabled={busy || !name.trim() || name.trim() === category.name}
        onClick={handleRename}
      >
        Save
      </button>
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--danger"
        disabled={busy}
        onClick={handleDelete}
        aria-label="Delete category"
      >
        <LuTrash2 aria-hidden="true" />
      </button>
    </li>
  )
}

export default CategoryRow
