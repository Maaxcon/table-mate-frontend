import { useState } from "react"
import { assignEmployee, createEmployee } from "@/features/admin/api/staff"
import type { EmployeeRole } from "@/features/admin/types"
import Modal from "@/features/admin/components/Modal"
import TextField from "@/features/admin/components/TextField"
import DiscardChangesDialog from "@/features/admin/components/DiscardChangesDialog"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useUnsavedGuard } from "@/features/admin/hooks/useUnsavedGuard"
import "@/features/admin/components/styles/adminForm.css"

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
  const toast = useToast()
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<EmployeeRole>("waiter")
  const [assignExisting, setAssignExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty =
    email.trim() !== "" ||
    firstName.trim() !== "" ||
    lastName.trim() !== "" ||
    phone.trim() !== "" ||
    role !== "waiter" ||
    assignExisting
  const guard = useUnsavedGuard(dirty, onClose)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (assignExisting) {
        await assignEmployee({ email: email.trim(), role })
      } else {
        await createEmployee({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
        })
      }
      toast.success(assignExisting ? "Staff role assigned" : "Employee added")
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal title="Add employee" onClose={guard.requestClose} active={!guard.confirming}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="text"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            hint={assignExisting ? undefined : "They sign in with Google using this email."}
          />
          <label className="admin-field">
            <span className="admin-field__label">
              <input
                type="checkbox"
                checked={assignExisting}
                onChange={(e) => setAssignExisting(e.target.checked)}
              />{" "}
              Assign an existing user
            </span>
            <span className="admin-field__hint">Sends only their email and selected role.</span>
          </label>
          {!assignExisting && (
            <>
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
            </>
          )}

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
              {submitting ? "Saving…" : assignExisting ? "Assign staff role" : "Add employee"}
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

export default AddEmployeeModal
