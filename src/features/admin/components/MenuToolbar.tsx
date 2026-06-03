import { useState } from "react"
import { LuTrash2 } from "react-icons/lu"
import { deleteMenu, updateMenu } from "../menuApi"
import type { AdminMenu } from "../types"
import ConfirmDialog from "./ConfirmDialog"

type MenuToolbarProps = {
  menu: AdminMenu
  onChanged: () => void
  onDeleted: () => void
}

// Relies on a `key={menu.public_id}` in the parent to re-init the name input
// when the selected menu changes.
function MenuToolbar({ menu, onChanged, onDeleted }: MenuToolbarProps) {
  const [name, setName] = useState(menu.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | "delete" | "hide">(null)

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      after()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  const handleRename = () => {
    if (!name.trim() || name.trim() === menu.name) return
    void run(() => updateMenu(menu.public_id, { name: name.trim() }), onChanged)
  }

  // Showing a menu is harmless; hiding it from customers asks first.
  const handleToggle = () => {
    if (menu.is_active) setConfirm("hide")
    else void run(() => updateMenu(menu.public_id, { is_active: true }), onChanged)
  }

  const confirmAction = async () => {
    if (confirm === "delete") {
      await run(() => deleteMenu(menu.public_id), onDeleted)
    } else if (confirm === "hide") {
      await run(() => updateMenu(menu.public_id, { is_active: false }), onChanged)
    }
    setConfirm(null)
  }

  return (
    <div className="menu-admin__toolbar">
      <input
        className="admin-field__input menu-admin__toolbar-name"
        value={name}
        disabled={busy}
        aria-label="Menu name"
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--primary"
        disabled={busy || !name.trim() || name.trim() === menu.name}
        onClick={handleRename}
      >
        Rename
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
      {error && <span className="menu-admin__error">{error}</span>}

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
