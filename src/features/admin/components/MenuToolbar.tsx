import { useState } from "react"
import { LuTrash2 } from "react-icons/lu"
import { deleteMenu, updateMenu } from "../menuApi"
import type { AdminMenu } from "../types"

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

  const handleToggle = () =>
    void run(() => updateMenu(menu.public_id, { is_active: !menu.is_active }), onChanged)

  const handleDelete = () => {
    const ok = window.confirm(
      `Delete "${menu.name}"? All its categories and dishes will be removed.`,
    )
    if (ok) void run(() => deleteMenu(menu.public_id), onDeleted)
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
        className="menu-admin__btn"
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
        onClick={handleDelete}
        aria-label="Delete menu"
      >
        <LuTrash2 aria-hidden="true" />
      </button>
      {error && <span className="menu-admin__error">{error}</span>}
    </div>
  )
}

export default MenuToolbar
