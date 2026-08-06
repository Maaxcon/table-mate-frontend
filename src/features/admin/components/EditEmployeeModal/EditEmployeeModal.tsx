import { useState } from "react"
import { updateEmployee } from "@/features/admin/api/staff"
import DiscardChangesDialog from "@/features/admin/components/DiscardChangesDialog"
import Modal from "@/features/admin/components/Modal"
import TextField from "@/features/admin/components/TextField"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useUnsavedGuard } from "@/features/admin/hooks/useUnsavedGuard"
import type { AdminEmployee } from "@/features/admin/types"
import "@/features/admin/components/styles/adminForm.css"

type EditEmployeeModalProps = {
  employee: AdminEmployee
  onClose: () => void
  onUpdated: (employee: AdminEmployee) => void
}

function EditEmployeeModal({ employee, onClose, onUpdated }: EditEmployeeModalProps) {
  const toast = useToast()
  const [staffDisplayName, setStaffDisplayName] = useState(employee.staff_display_name ?? "")
  const [firstName, setFirstName] = useState(employee.first_name ?? "")
  const [lastName, setLastName] = useState(employee.last_name ?? "")
  const [phone, setPhone] = useState(employee.phone ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty =
    staffDisplayName !== (employee.staff_display_name ?? "") ||
    firstName !== (employee.first_name ?? "") ||
    lastName !== (employee.last_name ?? "") ||
    phone !== (employee.phone ?? "")
  const guard = useUnsavedGuard(dirty, onClose)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const updated = await updateEmployee(employee.public_id, {
        staff_display_name: staffDisplayName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      onUpdated(updated)
      toast.success("Employee information updated")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update employee.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal title="Employee information" onClose={guard.requestClose} active={!guard.confirming}>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <span className="admin-field__label">Email</span>
            <div className="admin-field__input">{employee.email}</div>
          </div>
          <TextField
            label="Staff name"
            value={staffDisplayName}
            onChange={setStaffDisplayName}
            hint="Shown only in the admin staff list."
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
          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}
          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || !staffDisplayName.trim()}
            >
              {submitting ? "Saving…" : "Save changes"}
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

export default EditEmployeeModal
