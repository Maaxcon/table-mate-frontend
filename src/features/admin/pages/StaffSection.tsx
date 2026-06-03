import { useState } from "react"
import { LuPlus } from "react-icons/lu"
import { useEmployees } from "../hooks/useEmployees"
import AddEmployeeModal from "../components/AddEmployeeModal"
import "../components/SectionPlaceholder.css"
import "../components/staff.css"

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  waiter: "Waiter",
  cook: "Cook",
}

function StaffSection() {
  const { employees, loading, error, reload } = useEmployees()
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
        <ul className="staff-list">
          {employees.map((e) => {
            const name = `${e.first_name} ${e.last_name}`.trim() || e.email
            return (
              <li key={e.public_id} className="staff-row">
                <div className="staff-row__main">
                  <span className="staff-row__name">{name}</span>
                  <span className="staff-row__email">{e.email}</span>
                </div>
                <span className="staff-row__role">{ROLE_LABEL[e.role] ?? e.role}</span>
                <span
                  className={`staff-row__status${e.is_active ? "" : " staff-row__status--off"}`}
                >
                  {e.is_active ? "Active" : "Disabled"}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} onCreated={reload} />}
    </section>
  )
}

export default StaffSection
