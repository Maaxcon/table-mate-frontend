import { useRef, useState } from "react"
import { LuPlus } from "react-icons/lu"
import { createCategory } from "@/features/admin/api/menu"
import { DEFAULT_CATEGORY_COLOR } from "@/features/admin/constants/menu"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"

type AddCategoryFormProps = {
  menuId: string
  onCreated: () => void
}

function AddCategoryForm({ menuId, onCreated }: AddCategoryFormProps) {
  const toast = useToast()
  const strings = useAdminStrings()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR)
  const [colorEnabled, setColorEnabled] = useState(false)
  const colorInputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const payloadColor = colorEnabled ? color.toUpperCase() : undefined
      await createCategory(menuId, name.trim(), payloadColor)
      toast.success(strings.menu.categories.toasts.added)
      setName("")
      setColor(DEFAULT_CATEGORY_COLOR)
      setColorEnabled(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.categories.toasts.addError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="menu-admin__add-row" onSubmit={handleSubmit}>
      <div className="menu-admin__row-top">
        <input
          className="admin-field__input menu-admin__row-input"
          value={name}
          disabled={busy}
          placeholder={strings.menu.categories.newPlaceholder}
          aria-label={strings.menu.categories.nameAria}
          onChange={(e) => setName(e.target.value)}
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
                ? strings.menu.categories.color.change
                : strings.menu.categories.color.set
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
            {strings.menu.categories.color.clear}
          </button>
        </div>
        <button
          type="submit"
          className="menu-admin__btn menu-admin__btn--primary"
          disabled={busy || !name.trim()}
        >
          <LuPlus aria-hidden="true" />
          <span>{strings.menu.categories.buttons.add}</span>
        </button>
      </div>
      {error && <span className="menu-admin__error">{error}</span>}
    </form>
  )
}

export default AddCategoryForm
