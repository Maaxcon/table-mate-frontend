import { useState } from "react"
import { LuPlus } from "react-icons/lu"
import { createCategory } from "../menuApi"

type AddCategoryFormProps = {
  menuId: string
  onCreated: () => void
}

function AddCategoryForm({ menuId, onCreated }: AddCategoryFormProps) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createCategory(menuId, name.trim())
      setName("")
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="menu-admin__add-row" onSubmit={handleSubmit}>
      <input
        className="admin-field__input menu-admin__row-input"
        value={name}
        disabled={busy}
        placeholder="New category name"
        aria-label="New category name"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="menu-admin__btn" disabled={busy || !name.trim()}>
        <LuPlus aria-hidden="true" />
        <span>Add</span>
      </button>
      {error && <span className="menu-admin__error">{error}</span>}
    </form>
  )
}

export default AddCategoryForm
