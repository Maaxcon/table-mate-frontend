import { useState } from "react"
import { createMenu } from "@/features/admin/api/menu"
import type { AdminMenu } from "@/features/admin/types"
import Modal from "@/features/admin/components/Modal"
import TextField from "@/features/admin/components/TextField"
import DiscardChangesDialog from "@/features/admin/components/DiscardChangesDialog"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useUnsavedGuard } from "@/features/admin/hooks/useUnsavedGuard"
import "@/features/admin/components/styles/adminForm.css"

type AddMenuModalProps = {
  onClose: () => void
  onCreated: (menu: AdminMenu) => void
}

function AddMenuModal({ onClose, onCreated }: AddMenuModalProps) {
  const toast = useToast()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const guard = useUnsavedGuard(name.trim() !== "", onClose)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const menu = await createMenu(name.trim())
      toast.success("Menu added")
      onCreated(menu)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create menu.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal title="Add menu" onClose={guard.requestClose} active={!guard.confirming}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <TextField label="Name" value={name} onChange={setName} placeholder="Lunch menu" />
          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}
          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || !name.trim()}
            >
              {submitting ? "Adding…" : "Add menu"}
            </button>
          </div>
        </form>
      </Modal>

      {guard.confirming && (
        <DiscardChangesDialog onConfirm={guard.discard} onClose={guard.keepEditing} />
      )}
    </>
  )
}

export default AddMenuModal
