import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  LuArrowLeft,
  LuLogOut,
  LuSettings,
  LuStore,
  LuUsers,
  LuUtensilsCrossed,
} from "react-icons/lu"
import { apiFetch } from "@/api/client"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import "./AdminLayout.css"

const NAV_ITEMS = [
  { to: "/admin/restaurant", label: "Restaurant", icon: LuStore },
  { to: "/admin/settings", label: "Settings", icon: LuSettings },
  { to: "/admin/staff", label: "Staff", icon: LuUsers },
  { to: "/admin/menu", label: "Menu", icon: LuUtensilsCrossed },
] as const

function AdminLayout() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" })
    } finally {
      dispatch(clearAuth())
      navigate("/", { replace: true })
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__brand">
          <button
            type="button"
            className="admin-layout__icon-btn"
            onClick={() => navigate("/cabinet")}
            aria-label="Back to cabinet"
          >
            <LuArrowLeft aria-hidden="true" />
          </button>
          <span className="admin-layout__brand-name">Admin</span>
        </div>

        <nav className="admin-layout__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-layout__nav-link${isActive ? " admin-layout__nav-link--active" : ""}`
              }
            >
              <Icon aria-hidden="true" className="admin-layout__nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-layout__footer">
          {user && (
            <span className="admin-layout__user" title={user.email}>
              {user.firstName || user.email}
            </span>
          )}
          <button
            type="button"
            className="admin-layout__icon-btn"
            onClick={() => void handleLogout()}
            aria-label="Log out"
          >
            <LuLogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
