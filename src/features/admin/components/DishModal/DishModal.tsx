import { useEffect, useMemo, useState } from "react"
import { LuCopy, LuTrash2 } from "react-icons/lu"
import {
  clearItemImage,
  createItem,
  deleteItem,
  duplicateItem,
  updateItem,
  uploadItemImage,
  type ItemInput,
} from "@/features/admin/api/menu"
import type { AdminCategory, AdminMenuItem } from "@/features/admin/types"
import TextField from "@/features/admin/components/TextField"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import DiscardChangesDialog from "@/features/admin/components/DiscardChangesDialog"
import Modal from "@/features/admin/components/Modal"
import DishPhotoField from "./DishPhotoField"
import IngredientsField from "./IngredientsField"
import AllergensField from "./AllergensField"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAllergens } from "@/features/admin/hooks/useAllergens"
import { useUnsavedGuard } from "@/features/admin/hooks/useUnsavedGuard"
import { useAdminStrings } from "@/features/admin/strings"
import "@/features/admin/components/styles/adminForm.css"
import "@/features/admin/components/styles/modal.css"
import "@/features/admin/components/styles/menu.css"

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
  const strings = useAdminStrings()
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [price, setPrice] = useState(item?.price ?? "")
  const [category, setCategory] = useState<string>(item?.category ?? "")
  const [weight, setWeight] = useState(item?.weight_grams != null ? String(item.weight_grams) : "")
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [ingredients, setIngredients] = useState<string[]>(item?.ingredients ?? [])
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? [])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.image ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Show field errors only after the user leaves a field or tries to save.
  const [touched, setTouched] = useState<{ price: boolean; weight: boolean }>({
    price: false,
    weight: false,
  })
  const [submitted, setSubmitted] = useState(false)
  // Set once the dish is created, so a retry after an image-upload failure
  // updates that dish instead of creating a second one.
  const [createdId, setCreatedId] = useState<string | null>(null)

  const priceError = useMemo(() => {
    const v = price.trim()
    if (!v) return strings.menu.dishModal.validation.priceRequired
    const n = Number(v)
    if (!Number.isFinite(n)) return strings.menu.dishModal.validation.number
    if (n <= 0) return strings.menu.dishModal.validation.pricePositive
    return null
  }, [price])

  // Weight is optional, but if filled it must be a positive number.
  const weightError = useMemo(() => {
    const v = weight.trim()
    if (!v) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return strings.menu.dishModal.validation.number
    if (n <= 0) return strings.menu.dishModal.validation.weightPositive
    return null
  }, [weight])

  const invalid = priceError != null || weightError != null

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
  const guard = useUnsavedGuard(dirty, onClose)

  const handlePickImage = (file: File | null) => {
    if (!file) return
    setImageFile(file)
    setRemoveImage(false)
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
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
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (invalid) return
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
      // item from props, or a dish created on an earlier (failed) attempt.
      const existingId = item?.public_id ?? createdId
      let publicId: string
      if (existingId) {
        await updateItem(existingId, {
          category: payload.category,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          weight_grams: payload.weight_grams,
          is_available: payload.is_available,
          ingredients: payload.ingredients,
          allergens: payload.allergens,
        })
        publicId = existingId
      } else {
        const created = await createItem(payload)
        setCreatedId(created.public_id)
        publicId = created.public_id
      }

      if (imageFile) {
        setUploadingImage(true)
        await uploadItemImage(publicId, imageFile)
      } else if (existingId && removeImage) {
        setUploadingImage(true)
        await clearItemImage(publicId)
      }

      toast.success(
        editing ? strings.menu.dishModal.toasts.updated : strings.menu.dishModal.toasts.added,
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.dishModal.toasts.saveError)
      setSubmitting(false)
      setUploadingImage(false)
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
      toast.success(strings.menu.dishModal.toasts.duplicated)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.dishModal.toasts.duplicateError)
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    setDeleting(true)
    setError(null)
    try {
      await deleteItem(item.public_id)
      toast.success(strings.menu.dishModal.toasts.deleted)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.dishModal.toasts.deleteError)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <Modal
        title={strings.menu.dishModal.title(editing)}
        ariaLabel={strings.menu.dishModal.aria}
        onClose={guard.requestClose}
        className="admin-modal--dish"
        active={!confirmDelete && !guard.confirming}
      >
        <form className="admin-form dish-form" onSubmit={handleSubmit}>
          <div className="dish-form__grid">
            <DishPhotoField
              previewUrl={previewUrl}
              uploading={uploadingImage}
              onPick={handlePickImage}
              onRemove={handleRemoveImage}
            />

            <div className="dish-form__fields">
              <TextField
                label={strings.menu.dishModal.fields.name}
                value={name}
                onChange={setName}
              />
              <TextField
                label={strings.menu.dishModal.fields.description}
                value={description}
                onChange={setDescription}
              />
              <div className="admin-form__row">
                <TextField
                  label={strings.menu.dishModal.fields.price}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={setPrice}
                  onBlur={() => setTouched((t) => ({ ...t, price: true }))}
                  error={touched.price || submitted ? (priceError ?? undefined) : undefined}
                />
                <TextField
                  label={strings.menu.dishModal.fields.weight}
                  type="number"
                  value={weight}
                  onChange={setWeight}
                  placeholder={strings.menu.dishModal.fields.weightPlaceholder}
                  onBlur={() => setTouched((t) => ({ ...t, weight: true }))}
                  error={touched.weight || submitted ? (weightError ?? undefined) : undefined}
                />
              </div>

              <label className="admin-field">
                <span className="admin-field__label">{strings.menu.dishModal.fields.category}</span>
                <select
                  className="admin-field__input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">{strings.menu.dishModal.fields.noCategory}</option>
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
                <span className="admin-field__label">
                  {strings.menu.dishModal.fields.available}
                </span>
              </label>

              <IngredientsField value={ingredients} onChange={setIngredients} />
              <AllergensField value={allergens} options={allergenOptions} onChange={setAllergens} />
            </div>
          </div>

          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || deleting || duplicating || !name.trim() || invalid}
            >
              {submitting
                ? strings.menu.dishModal.buttons.saving
                : strings.menu.dishModal.buttons.save}
            </button>
            {editing && (
              <button
                type="button"
                className="menu-admin__btn dish-duplicate"
                onClick={() => void handleDuplicate()}
                disabled={submitting || deleting || duplicating}
              >
                <LuCopy aria-hidden="true" />
                <span>
                  {duplicating
                    ? strings.menu.dishModal.buttons.duplicating
                    : strings.menu.dishModal.buttons.duplicate}
                </span>
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
                <span>
                  {deleting
                    ? strings.menu.dishModal.buttons.deleting
                    : strings.menu.dishModal.buttons.delete}
                </span>
              </button>
            )}
          </div>
        </form>
      </Modal>

      {confirmDelete && item && (
        <ConfirmDialog
          title={strings.menu.dishModal.confirmDelete.title}
          message={strings.menu.dishModal.confirmDelete.message(item.name)}
          confirmLabel={strings.menu.dishModal.confirmDelete.confirm}
          tone="danger"
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {guard.confirming && (
        <DiscardChangesDialog onConfirm={guard.discard} onClose={guard.keepEditing} />
      )}
    </>
  )
}

export default DishModal
