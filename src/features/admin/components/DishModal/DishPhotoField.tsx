import { LuImagePlus } from "react-icons/lu"

type DishPhotoFieldProps = {
  previewUrl: string | null
  uploading: boolean
  onPick: (file: File | null) => void
  onRemove: () => void
}

/** Dish photo picker: preview, change, remove, and an upload spinner. */
function DishPhotoField({ previewUrl, uploading, onPick, onRemove }: DishPhotoFieldProps) {
  return (
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
        {uploading && (
          <span className="dish-photo__loading" aria-label="Uploading photo">
            <span className="dish-photo__spinner" aria-hidden="true" />
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {previewUrl && (
        <button type="button" className="menu-admin__btn dish-photo__remove" onClick={onRemove}>
          Remove photo
        </button>
      )}
    </div>
  )
}

export default DishPhotoField
