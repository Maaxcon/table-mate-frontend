import { useState } from "react"
import { createMenu } from "../menuApi"
import type { AdminMenu } from "../types"
import Modal from "./Modal"
import TextField from "./TextField"
import { useToast } from "./toastContext"
import "./adminForm.css"

type AddMenuModalProps = {
  onClose: () => void
  onCreated: (menu: AdminMenu) => void
}

function AddMenuModal({ onClose, onCreated }: AddMenuModalProps) {
  const toast = useToast()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <Modal title="Add menu" onClose={onClose}>
      <form className="admin-form" onSubmit={handleSubmit}>
        <TextField label="Name" value={name} onChange={setName} placeholder="Lunch menu" />
        {error && <p className="admin-form__status admin-form__status--error">{error}</p>}
        <div className="admin-form__actions">
          <button type="submit" className="admin-form__save" disabled={submitting || !name.trim()}>
            {submitting ? "Adding…" : "Add menu"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddMenuModal
