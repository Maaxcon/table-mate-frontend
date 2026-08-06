import { useState } from "react"
import { updateEmployee, type EmployeePatch } from "@/features/admin/api/staff"
import type { AdminEmployee, EmployeeRole } from "@/features/admin/types"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import { useToast } from "@/features/admin/hooks/toastContext"

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: "waiter", label: "Waiter" },
  { value: "cook", label: "Cook" },
  { value: "admin", label: "Admin" },
]

type EmployeeRowProps = {
  employee: AdminEmployee
  onUpdated: (updated: AdminEmployee) => void
  onRemoveRequested: (employee: AdminEmployee) => void
}

function EmployeeRow({ employee, onUpdated, onRemoveRequested }: EmployeeRowProps) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const change = async (patch: EmployeePatch, successMsg: string) => {
    setSaving(true)
    try {
      const updated = await updateEmployee(employee.public_id, patch)
      onUpdated(updated)
      toast.success(successMsg)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update employee.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const name = employee.staff_display_name || employee.email

  // Enabling is safe and instant; disabling asks for confirmation first.
  const handleToggle = () => {
    if (employee.is_active) setConfirmDisable(true)
    else void change({ is_active: true }, "Employee enabled")
  }

  const confirmDisableAction = async () => {
    const ok = await change({ is_active: false }, "Employee disabled")
    if (ok) setConfirmDisable(false)
  }

  return (
    <li className={`staff-row${employee.is_active ? "" : " staff-row--disabled"}`}>
      <div className="staff-row__main">
        <span className="staff-row__name">{name}</span>
        <span className="staff-row__email">{employee.email}</span>
      </div>

      <div className="staff-row__controls">
        <select
          className="staff-row__select"
          value={employee.role}
          disabled={saving}
          aria-label={`Role for ${name}`}
          onChange={(e) => void change({ role: e.target.value as EmployeeRole }, "Role updated")}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="staff-row__toggle"
          disabled={saving}
          onClick={handleToggle}
        >
          {employee.is_active ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          className="staff-row__remove"
          disabled={saving}
          onClick={() => onRemoveRequested(employee)}
        >
          Remove
        </button>
      </div>

      {confirmDisable && (
        <ConfirmDialog
          title="Disable employee"
          message={`Disable ${name}? They will lose access until you enable them again.`}
          confirmLabel="Disable"
          tone="danger"
          busy={saving}
          onConfirm={() => void confirmDisableAction()}
          onClose={() => setConfirmDisable(false)}
        />
      )}
    </li>
  )
}

export default EmployeeRow
