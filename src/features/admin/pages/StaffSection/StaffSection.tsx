import { useMemo, useState } from "react"
import { LuPlus } from "react-icons/lu"
import { removeEmployee as removeStaffEmployee } from "@/features/admin/api/staff"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import { useEmployees } from "@/features/admin/hooks/useEmployees"
import AddEmployeeModal from "@/features/admin/components/AddEmployeeModal"
import EmployeeRow from "@/features/admin/components/EmployeeRow"
import SearchBox from "@/features/admin/components/SearchBox"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
import type { AdminEmployee } from "@/features/admin/types"
import "@/features/admin/components/styles/SectionPlaceholder.css"
import "./staff.css"

function StaffSection() {
  const {
    employees,
    loading,
    error,
    reload,
    applyUpdate,
    removeEmployee: removeFromList,
  } = useEmployees()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState("")
  const [employeeToRemove, setEmployeeToRemove] = useState<AdminEmployee | null>(null)
  const [removing, setRemoving] = useState(false)
  const strings = useAdminStrings()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const name = (e.staff_display_name ?? "").toLowerCase()
      return name.includes(q) || e.email.toLowerCase().includes(q)
    })
  }, [employees, query])

  const confirmRemove = async () => {
    if (!employeeToRemove) return

    setRemoving(true)
    try {
      await removeStaffEmployee(employeeToRemove.public_id)
      removeFromList(employeeToRemove.public_id)
      setEmployeeToRemove(null)
      toast.success("Employee removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove employee.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="admin-section">
      <header className="admin-section__header staff-header">
        <div>
          <h1 className="admin-section__title">{strings.staff.title}</h1>
          <p className="admin-section__description">{strings.staff.description}</p>
        </div>
        <button type="button" className="staff-add-btn" onClick={() => setAdding(true)}>
          <LuPlus aria-hidden="true" />
          <span>{strings.staff.add}</span>
        </button>
      </header>

      {loading ? (
        <p className="admin-section__description">{strings.common.loading}</p>
      ) : error ? (
        <p className="staff-error">{error}</p>
      ) : employees.length === 0 ? (
        <p className="admin-section__description">{strings.staff.empty}</p>
      ) : (
        <>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={strings.staff.searchPlaceholder}
            ariaLabel={strings.staff.searchAria}
          />

          {filtered.length === 0 ? (
            <p className="admin-section__description">{strings.staff.emptyQuery(query.trim())}</p>
          ) : (
            <div className="staff-table">
              <div className="staff-table__head" aria-hidden="true">
                <span>{strings.staff.table.name}</span>
                <span>{strings.staff.table.email}</span>
                <span>{strings.staff.table.role}</span>
                <span />
              </div>
              <ul className="staff-list">
                {filtered.map((e) => (
                  <EmployeeRow
                    key={e.public_id}
                    employee={e}
                    onUpdated={applyUpdate}
                    onRemoveRequested={setEmployeeToRemove}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} onCreated={reload} />}
      {employeeToRemove && (
        <ConfirmDialog
          title="Remove employee"
          message={`Remove ${employeeToRemove.email} from this restaurant? Their account will remain available as a customer.`}
          confirmLabel="Remove"
          tone="danger"
          busy={removing}
          onConfirm={() => void confirmRemove()}
          onClose={() => setEmployeeToRemove(null)}
        />
      )}
    </section>
  )
}

export default StaffSection
