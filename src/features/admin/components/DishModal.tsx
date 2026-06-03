import { useEffect, useState } from "react"
import { LuX } from "react-icons/lu"
import { createItem, updateItem, type ItemInput } from "../menuApi"
import type { AdminCategory, AdminMenuItem } from "../types"
import TextField from "./TextField"
import "./adminForm.css"
import "./modal.css"

type DishModalProps = {
  menuId: string
  categories: AdminCategory[]
  item: AdminMenuItem | null
  onClose: () => void
  onSaved: () => void
}

function DishModal({ menuId, categories, item, onClose, onSaved }: DishModalProps) {
  const editing = item !== null
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [price, setPrice] = useState(item?.price ?? "")
  const [category, setCategory] = useState<string>(item?.category ?? "")
  const [weight, setWeight] = useState(item?.weight_grams != null ? String(item.weight_grams) : "")
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload: ItemInput = {
      menu: menuId,
      category: category || null,
      name: name.trim(),
      description: description.trim(),
      price: price.trim(),
      weight_grams: weight.trim() ? Number(weight) : null,
      is_available: isAvailable,
    }
    try {
      if (editing) {
        await updateItem(item.public_id, {
          category: payload.category,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          weight_grams: payload.weight_grams,
          is_available: payload.is_available,
        })
      } else {
        await createItem(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save dish.")
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-modal__overlay">
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Dish">
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">{editing ? "Edit dish" : "Add dish"}</h2>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Close">
            <LuX aria-hidden="true" />
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <TextField label="Name" value={name} onChange={setName} />
          <TextField label="Description" value={description} onChange={setDescription} />
          <div className="admin-form__row">
            <TextField
              label="Price"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={setPrice}
            />
            <TextField
              label="Weight (g)"
              type="number"
              value={weight}
              onChange={setWeight}
              placeholder="optional"
            />
          </div>

          <label className="admin-field">
            <span className="admin-field__label">Category</span>
            <select
              className="admin-field__input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.public_id} value={c.public_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field admin-field--check">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
            />
            <span className="admin-field__label">Available to customers</span>
          </label>

          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || !name.trim() || !price.trim()}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DishModal
