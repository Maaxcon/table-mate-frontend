import { useRef, useState } from "react"
import { LuImagePlus, LuTrash2 } from "react-icons/lu"
import { clearRestaurantCover, uploadRestaurantCover } from "@/features/admin/api/restaurant"
import { useToast } from "@/features/admin/hooks/toastContext"
import "./RestaurantCover.css"

type RestaurantCoverProps = {
  restaurantId: string
  initialCover: string | null
}

function RestaurantCover({ restaurantId, initialCover }: RestaurantCoverProps) {
  const toast = useToast()
  const [cover, setCover] = useState<string | null>(initialCover)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const updated = await uploadRestaurantCover(restaurantId, file)
      setCover(updated.cover_image ?? null)
      toast.success("Cover updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload cover image.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    try {
      await clearRestaurantCover(restaurantId)
      setCover(null)
      toast.success("Cover removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove cover image.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">Cover image</span>
      <div className="restaurant-cover">
        {cover ? (
          <img className="restaurant-cover__img" src={cover} alt="Restaurant cover" />
        ) : (
          <span className="restaurant-cover__empty">
            <LuImagePlus aria-hidden="true" />
            No cover image yet
          </span>
        )}
        {busy && <span className="restaurant-cover__busy">Uploading…</span>}
      </div>
      <div className="restaurant-cover__actions">
        <button
          type="button"
          className="restaurant-cover__btn"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <LuImagePlus aria-hidden="true" />
          <span>{cover ? "Change cover" : "Upload cover"}</span>
        </button>
        {cover && (
          <button
            type="button"
            className="restaurant-cover__btn restaurant-cover__btn--danger"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            <LuTrash2 aria-hidden="true" />
            <span>Remove</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void handlePick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}

export default RestaurantCover
