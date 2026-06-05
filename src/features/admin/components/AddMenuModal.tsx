import { useEffect, useState } from "react"
import { LuX } from "react-icons/lu"
import { createMenu } from "../menuApi"
import type { AdminMenu } from "../types"
import TextField from "./TextField"
import { useToast } from "./toastContext"
import { useModalFocus } from "../hooks/useModalFocus"
import "./adminForm.css"
import "./modal.css"

type AddMenuModalProps = {
  onClose: () => void
  onCreated: (menu: AdminMenu) => void
}

function AddMenuModal({ onClose, onCreated }: AddMenuModalProps) {
  const toast = useToast()
  const dialogRef = useModalFocus()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

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
    <div className="admin-modal__overlay">
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add menu"
      >
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">Add menu</h2>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Close">
            <LuX aria-hidden="true" />
          </button>
        </div>
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
      </div>
    </div>
  )
}

export default AddMenuModal
