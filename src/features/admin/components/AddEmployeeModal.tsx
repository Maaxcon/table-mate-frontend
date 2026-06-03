import { useEffect, useState } from "react"
import { LuX } from "react-icons/lu"
import { createEmployee } from "../api"
import type { EmployeeRole } from "../types"
import TextField from "./TextField"
import "./adminForm.css"
import "./modal.css"

type AddEmployeeModalProps = {
  onClose: () => void
  onCreated: () => void
}

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: "waiter", label: "Waiter" },
  { value: "cook", label: "Cook" },
  { value: "admin", label: "Admin" },
]

function AddEmployeeModal({ onClose, onCreated }: AddEmployeeModalProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<EmployeeRole>("waiter")
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
      await createEmployee({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        role,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee.")
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
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Add employee">
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">Add employee</h2>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Close">
            <LuX aria-hidden="true" />
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="text"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            hint="They sign in with Google using this email."
          />
          <div className="admin-form__row">
            <TextField label="First name" value={firstName} onChange={setFirstName} />
            <TextField label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <TextField
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="+380..."
          />

          <label className="admin-field">
            <span className="admin-field__label">Role</span>
            <select
              className="admin-field__input"
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || !email.trim()}
            >
              {submitting ? "Adding…" : "Add employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddEmployeeModal
