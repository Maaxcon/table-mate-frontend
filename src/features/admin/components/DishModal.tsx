import { useCallback, useEffect, useState } from "react"
import { LuCopy, LuImagePlus, LuTrash2, LuX } from "react-icons/lu"
import {
  clearItemImage,
  createItem,
  deleteItem,
  duplicateItem,
  updateItem,
  uploadItemImage,
  type ItemInput,
} from "../menuApi"
import type { AdminCategory, AdminMenuItem } from "../types"
import TextField from "./TextField"
import ConfirmDialog from "./ConfirmDialog"
import { useToast } from "./toastContext"
import { useAllergens } from "../hooks/useAllergens"
import { useModalFocus } from "../hooks/useModalFocus"
import "./adminForm.css"
import "./modal.css"
import "./menu.css"

type DishModalProps = {
  menuId: string
  categories: AdminCategory[]
  item: AdminMenuItem | null
  onClose: () => void
  onSaved: () => void
}

function DishModal({ menuId, categories, item, onClose, onSaved }: DishModalProps) {
  const editing = item !== null
  const toast = useToast()
  const allergenOptions = useAllergens()
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [price, setPrice] = useState(item?.price ?? "")
  const [category, setCategory] = useState<string>(item?.category ?? "")
  const [weight, setWeight] = useState(item?.weight_grams != null ? String(item.weight_grams) : "")
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [ingredients, setIngredients] = useState<string[]>(item?.ingredients ?? [])
  const [ingredientInput, setIngredientInput] = useState("")
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? [])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.image ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Suspend the focus trap while a nested confirm dialog is open so it can take over.
  const dialogRef = useModalFocus<HTMLDivElement>(!confirmDelete && !confirmDiscard)

  const dirty =
    name !== (item?.name ?? "") ||
    description !== (item?.description ?? "") ||
    price !== (item?.price ?? "") ||
    category !== (item?.category ?? "") ||
    weight !== (item?.weight_grams != null ? String(item.weight_grams) : "") ||
    isAvailable !== (item?.is_available ?? true) ||
    JSON.stringify(ingredients) !== JSON.stringify(item?.ingredients ?? []) ||
    JSON.stringify(allergens) !== JSON.stringify(item?.allergens ?? []) ||
    imageFile !== null ||
    removeImage

  // Closing with unsaved edits asks for confirmation first.
  const requestClose = useCallback(() => {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }, [dirty, onClose])

  const handlePickImage = (file: File | null) => {
    if (!file) return
    setImageFile(file)
    setRemoveImage(false)
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const addIngredient = () => {
    const value = ingredientInput.trim()
    if (!value) return
    setIngredients((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setIngredientInput("")
  }

  const handleRemoveImage = () => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return null
    })
    setImageFile(null)
    setRemoveImage(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [requestClose])

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
      ingredients,
      allergens,
    }
    try {
      let publicId: string
      if (editing) {
        await updateItem(item.public_id, {
          category: payload.category,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          weight_grams: payload.weight_grams,
          is_available: payload.is_available,
          ingredients: payload.ingredients,
          allergens: payload.allergens,
        })
        publicId = item.public_id
      } else {
        const created = await createItem(payload)
        publicId = created.public_id
      }

      if (imageFile) {
        await uploadItemImage(publicId, imageFile)
      } else if (editing && removeImage) {
        await clearItemImage(publicId)
      }

      toast.success(editing ? "Dish updated" : "Dish added")
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save dish.")
      setSubmitting(false)
    }
  }

  // Duplicates the saved dish on the server (photo included). Unsaved edits in
  // the open form are not part of the copy — duplicate acts on the stored item.
  const handleDuplicate = async () => {
    if (!item) return
    setDuplicating(true)
    setError(null)
    try {
      await duplicateItem(item.public_id)
      toast.success("Dish duplicated")
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate dish.")
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    setDeleting(true)
    setError(null)
    try {
      await deleteItem(item.public_id)
      toast.success("Dish deleted")
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete dish.")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="admin-modal__overlay">
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label="Close"
        onClick={requestClose}
      />
      <div
        ref={dialogRef}
        className="admin-modal admin-modal--dish"
        role="dialog"
        aria-modal="true"
        aria-label="Dish"
      >
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">{editing ? "Edit dish" : "Add dish"}</h2>
          <button
            type="button"
            className="admin-modal__close"
            onClick={requestClose}
            aria-label="Close"
          >
            <LuX aria-hidden="true" />
          </button>
        </div>

        <form className="admin-form dish-form" onSubmit={handleSubmit}>
          <div className="dish-form__grid">
            <div className="dish-form__photo">
              <label className="dish-photo">
                {previewUrl ? (
                  <img className="dish-photo__img" src={previewUrl} alt="Dish" />
                ) : (
                  <span className="dish-photo__empty">
                    <LuImagePlus aria-hidden="true" />
                    Add a photo
                  </span>
                )}
                <span className="dish-photo__overlay">Change photo</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)}
                />
              </label>
              {previewUrl && (
                <button
                  type="button"
                  className="menu-admin__btn dish-photo__remove"
                  onClick={handleRemoveImage}
                >
                  Remove photo
                </button>
              )}
            </div>

            <div className="dish-form__fields">
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

              <div className="admin-field">
                <span className="admin-field__label">Ingredients</span>
                <div className="dish-ingredient-add">
                  <input
                    className="admin-field__input"
                    value={ingredientInput}
                    placeholder="Type an ingredient, press Enter"
                    onChange={(e) => setIngredientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addIngredient()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="menu-admin__btn menu-admin__btn--primary"
                    onClick={addIngredient}
                    disabled={!ingredientInput.trim()}
                  >
                    Add
                  </button>
                </div>
                {ingredients.length > 0 && (
                  <div className="dish-allergens">
                    {ingredients.map((ing) => (
                      <span key={ing} className="dish-allergen">
                        {ing}
                        <button
                          type="button"
                          className="dish-allergen__remove"
                          aria-label={`Remove ${ing}`}
                          onClick={() => setIngredients((prev) => prev.filter((x) => x !== ing))}
                        >
                          <LuX aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-field">
                <span className="admin-field__label">Allergens</span>
                <select
                  className="admin-field__input"
                  value=""
                  onChange={(e) => {
                    const value = e.target.value
                    if (value) setAllergens((prev) => [...prev, value])
                  }}
                >
                  <option value="">Add allergen…</option>
                  {allergenOptions
                    .filter((a) => !allergens.includes(a))
                    .map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                </select>
                {allergens.length > 0 && (
                  <div className="dish-allergens">
                    {allergens.map((a) => (
                      <span key={a} className="dish-allergen">
                        {a}
                        <button
                          type="button"
                          className="dish-allergen__remove"
                          aria-label={`Remove ${a}`}
                          onClick={() => setAllergens((prev) => prev.filter((x) => x !== a))}
                        >
                          <LuX aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || deleting || duplicating || !name.trim() || !price.trim()}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            {editing && (
              <button
                type="button"
                className="menu-admin__btn dish-duplicate"
                onClick={() => void handleDuplicate()}
                disabled={submitting || deleting || duplicating || !name.trim() || !price.trim()}
              >
                <LuCopy aria-hidden="true" />
                <span>{duplicating ? "Duplicating…" : "Duplicate"}</span>
              </button>
            )}
            {editing && (
              <button
                type="button"
                className="menu-admin__btn menu-admin__btn--danger dish-delete"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting || deleting || duplicating}
              >
                <LuTrash2 aria-hidden="true" />
                <span>{deleting ? "Deleting…" : "Delete"}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {confirmDelete && item && (
        <ConfirmDialog
          title="Delete dish"
          message={`Delete dish "${item.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved changes. Close without saving?"
          confirmLabel="Discard"
          tone="danger"
          onConfirm={onClose}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  )
}

export default DishModal
