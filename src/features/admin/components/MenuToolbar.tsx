import { useState } from "react"
import { LuPencil, LuTrash2 } from "react-icons/lu"
import { deleteMenu, updateMenu } from "../menuApi"
import type { AdminMenu } from "../types"
import ConfirmDialog from "./ConfirmDialog"
import { useToast } from "./toastContext"

type MenuToolbarProps = {
  menu: AdminMenu
  onChanged: () => void
  onDeleted: () => void
}

// Relies on a `key={menu.public_id}` in the parent to re-init state when the
// selected menu changes.
function MenuToolbar({ menu, onChanged, onDeleted }: MenuToolbarProps) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<null | "delete" | "hide">(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(menu.name)

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

  const openRename = () => {
    setName(menu.name)
    setRenaming(true)
  }

  const submitRename = () => {
    if (!name.trim() || name.trim() === menu.name) {
      setRenaming(false)
      return
    }
    void run(
      () => updateMenu(menu.public_id, { name: name.trim() }),
      () => {
        setRenaming(false)
        onChanged()
      },
      "Menu renamed",
    )
  }

  // Showing a menu is harmless; hiding it from customers asks first.
  const handleToggle = () => {
    if (menu.is_active) setConfirm("hide")
    else void run(() => updateMenu(menu.public_id, { is_active: true }), onChanged, "Menu shown")
  }

  const confirmAction = async () => {
    if (confirm === "delete") {
      await run(() => deleteMenu(menu.public_id), onDeleted, "Menu deleted")
    } else if (confirm === "hide") {
      await run(() => updateMenu(menu.public_id, { is_active: false }), onChanged, "Menu hidden")
    }
    setConfirm(null)
  }

  return (
    <div className="menu-admin__toolbar">
      <button type="button" className="menu-admin__btn" disabled={busy} onClick={openRename}>
        <LuPencil aria-hidden="true" />
        <span>Rename</span>
      </button>
      <button type="button" className="menu-admin__btn" disabled={busy} onClick={handleToggle}>
        {menu.is_active ? "Hide" : "Show"}
      </button>
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--danger"
        disabled={busy}
        onClick={() => setConfirm("delete")}
        aria-label="Delete menu"
      >
        <LuTrash2 aria-hidden="true" />
      </button>

      {renaming && (
        <div className="admin-modal__overlay admin-confirm__overlay">
          <button
            type="button"
            className="admin-modal__backdrop"
            aria-label="Cancel"
            onClick={() => {
              if (!busy) setRenaming(false)
            }}
          />
          <div
            className="admin-modal admin-modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Rename menu"
          >
            <div className="admin-modal__header">
              <h2 className="admin-modal__title">Rename menu</h2>
            </div>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault()
                submitRename()
              }}
            >
              <label className="admin-field">
                <span className="admin-field__label">Menu name</span>
                <input
                  className="admin-field__input"
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="admin-modal__actions">
                <button
                  type="button"
                  className="admin-modal__btn"
                  disabled={busy}
                  onClick={() => setRenaming(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-modal__btn admin-modal__btn--primary"
                  disabled={busy || !name.trim()}
                >
                  {busy ? "…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm === "delete" && (
        <ConfirmDialog
          title="Delete menu"
          message={`Delete "${menu.name}"? All its categories and dishes will be removed.`}
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          onConfirm={() => void confirmAction()}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "hide" && (
        <ConfirmDialog
          title="Hide menu"
          message={`Hide "${menu.name}" from customers? You can show it again later.`}
          confirmLabel="Hide"
          busy={busy}
          onConfirm={() => void confirmAction()}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

export default MenuToolbar
