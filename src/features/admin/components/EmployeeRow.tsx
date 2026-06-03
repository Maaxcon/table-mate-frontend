import { useState } from "react"
import { updateEmployee, type EmployeePatch } from "../api"
import type { AdminEmployee, EmployeeRole } from "../types"
import ConfirmDialog from "./ConfirmDialog"

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: "waiter", label: "Waiter" },
  { value: "cook", label: "Cook" },
  { value: "admin", label: "Admin" },
]

type EmployeeRowProps = {
  employee: AdminEmployee
  onUpdated: (updated: AdminEmployee) => void
}

function EmployeeRow({ employee, onUpdated }: EmployeeRowProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const change = async (patch: EmployeePatch) => {
    setSaving(true)
    setError(false)
    try {
      const updated = await updateEmployee(employee.public_id, patch)
      onUpdated(updated)
      return true
    } catch {
      setError(true)
      return false
    } finally {
      setSaving(false)
    }
  }

  const name = `${employee.first_name} ${employee.last_name}`.trim() || employee.email

  // Enabling is safe and instant; disabling asks for confirmation first.
  const handleToggle = () => {
    if (employee.is_active) setConfirmDisable(true)
    else void change({ is_active: true })
  }

  const confirmDisableAction = async () => {
    const ok = await change({ is_active: false })
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
          onChange={(e) => void change({ role: e.target.value as EmployeeRole })}
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

        {error && (
          <span className="staff-row__err" role="alert" title="Could not save">
            !
          </span>
        )}
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
