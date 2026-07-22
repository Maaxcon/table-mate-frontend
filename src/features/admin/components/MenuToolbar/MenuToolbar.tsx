import { useState } from "react"
import { LuPencil, LuTrash2 } from "react-icons/lu"
import { deleteMenu, updateMenu } from "@/features/admin/api/menu"
import type { AdminMenu } from "@/features/admin/types"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import Modal from "@/features/admin/components/Modal"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"

type MenuToolbarProps = {
  menu: AdminMenu
  onChanged: () => void
  onDeleted: () => void
}

// Relies on a `key={menu.public_id}` in the parent to re-init state when the
// selected menu changes.
function MenuToolbar({ menu, onChanged, onDeleted }: MenuToolbarProps) {
  const toast = useToast()
  const strings = useAdminStrings()
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
      toast.error(err instanceof Error ? err.message : strings.menu.toolbar.toasts.actionError)
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
      strings.menu.toolbar.toasts.renamed,
    )
  }

  // Showing a menu is harmless; hiding it from customers asks first.
  const handleToggle = () => {
    if (menu.is_active) setConfirm("hide")
    else
      void run(
        () => updateMenu(menu.public_id, { is_active: true }),
        onChanged,
        strings.menu.toolbar.toasts.shown,
      )
  }

  const confirmAction = async () => {
    if (confirm === "delete") {
      await run(() => deleteMenu(menu.public_id), onDeleted, strings.menu.toolbar.toasts.deleted)
    } else if (confirm === "hide") {
      await run(
        () => updateMenu(menu.public_id, { is_active: false }),
        onChanged,
        strings.menu.toolbar.toasts.hidden,
      )
    }
    setConfirm(null)
  }

  return (
    <div className="menu-admin__toolbar">
      <button type="button" className="menu-admin__btn" disabled={busy} onClick={openRename}>
        <LuPencil aria-hidden="true" />
        <span>{strings.menu.toolbar.rename}</span>
      </button>
      <button type="button" className="menu-admin__btn" disabled={busy} onClick={handleToggle}>
        {menu.is_active ? strings.menu.toolbar.hide : strings.menu.toolbar.show}
      </button>
      <button
        type="button"
        className="menu-admin__btn menu-admin__btn--danger"
        disabled={busy}
        onClick={() => setConfirm("delete")}
        aria-label={strings.menu.toolbar.deleteAria}
      >
        <LuTrash2 aria-hidden="true" />
      </button>

      {renaming && (
        <Modal
          title={strings.menu.toolbar.renameTitle}
          onClose={() => setRenaming(false)}
          showClose={false}
          closeDisabled={busy}
          overlayClassName="admin-confirm__overlay"
          className="admin-modal--confirm"
          backdropLabel={strings.menu.toolbar.cancel}
        >
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault()
              submitRename()
            }}
          >
            <label className="admin-field">
              <span className="admin-field__label">{strings.menu.toolbar.nameLabel}</span>
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
                {strings.menu.toolbar.cancel}
              </button>
              <button
                type="submit"
                className="admin-modal__btn admin-modal__btn--primary"
                disabled={busy || !name.trim()}
              >
                {busy ? "…" : strings.menu.toolbar.save}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm === "delete" && (
        <ConfirmDialog
          title={strings.menu.toolbar.confirmDelete.title}
          message={strings.menu.toolbar.confirmDelete.message(menu.name)}
          confirmLabel={strings.menu.toolbar.confirmDelete.confirm}
          tone="danger"
          busy={busy}
          onConfirm={() => void confirmAction()}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "hide" && (
        <ConfirmDialog
          title={strings.menu.toolbar.confirmHide.title}
          message={strings.menu.toolbar.confirmHide.message(menu.name)}
          confirmLabel={strings.menu.toolbar.confirmHide.confirm}
          busy={busy}
          onConfirm={() => void confirmAction()}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

export default MenuToolbar
