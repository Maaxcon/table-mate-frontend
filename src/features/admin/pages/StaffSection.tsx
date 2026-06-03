import { useState } from "react"
import { LuPlus } from "react-icons/lu"
import { useEmployees } from "../hooks/useEmployees"
import AddEmployeeModal from "../components/AddEmployeeModal"
import EmployeeRow from "../components/EmployeeRow"
import "../components/SectionPlaceholder.css"
import "../components/staff.css"

function StaffSection() {
  const { employees, loading, error, reload, applyUpdate } = useEmployees()
  const [adding, setAdding] = useState(false)

  return (
    <section className="admin-section">
      <header className="admin-section__header staff-header">
        <div>
          <h1 className="admin-section__title">Staff</h1>
          <p className="admin-section__description">
            Manage employees — change roles and enable or disable access.
          </p>
        </div>
        <button type="button" className="staff-add-btn" onClick={() => setAdding(true)}>
          <LuPlus aria-hidden="true" />
          <span>Add employee</span>
        </button>
      </header>

      {loading ? (
        <p className="admin-section__description">Loading…</p>
      ) : error ? (
        <p className="staff-error">{error}</p>
      ) : employees.length === 0 ? (
        <p className="admin-section__description">No staff yet.</p>
      ) : (
        <div className="staff-table">
          <div className="staff-table__head" aria-hidden="true">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span />
          </div>
          <ul className="staff-list">
            {employees.map((e) => (
              <EmployeeRow key={e.public_id} employee={e} onUpdated={applyUpdate} />
            ))}
          </ul>
        </div>
      )}

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} onCreated={reload} />}
    </section>
  )
}

export default StaffSection
