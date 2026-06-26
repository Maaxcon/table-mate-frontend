import { useMemo, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LuArrowLeft,
  LuCalendarClock,
  LuChefHat,
  LuLayoutDashboard,
  LuLogOut,
  LuMap,
  LuPencilRuler,
  LuSettings,
  LuStore,
  LuUsers,
  LuUtensilsCrossed,
} from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useLogout } from "@/features/auth/hooks/useLogout"
import { ToastProvider } from "./components/toast"
import ConfirmDialog from "./components/ConfirmDialog"
import { UnsavedChangesContext } from "./hooks/unsavedChanges"
import "./AdminLayout.css"

const NAV_ITEMS = [
  { to: "/admin/overview", label: "Overview", icon: LuLayoutDashboard },
  { to: "/admin/restaurant", label: "Restaurant", icon: LuStore },
  { to: "/admin/settings", label: "Settings", icon: LuSettings },
  { to: "/admin/staff", label: "Staff", icon: LuUsers },
  { to: "/admin/menu", label: "Menu", icon: LuUtensilsCrossed },
  { to: "/admin/scheduler", label: "Scheduler", icon: LuCalendarClock },
  { to: "/admin/floor-plan/edit", label: "Floor Plan", icon: LuPencilRuler },
  { to: "/admin/kitchen", label: "Kitchen", icon: LuChefHat },
  { to: "/admin/floor", label: "Floor", icon: LuMap },
] as const

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, logoutFailed } = useLogout()
  const user = useAppSelector((state) => state.auth.user)

  const [dirty, setDirty] = useState(false)
  // A queued navigation, held back until the user confirms leaving unsaved edits.
  const [pending, setPending] = useState<(() => void) | null>(null)

  const unsavedValue = useMemo(() => ({ setDirty }), [])

  const guarded = (action: () => void) => {
    if (dirty) setPending(() => action)
    else action()
  }

  const confirmLeave = () => {
    const action = pending
    setPending(null)
    setDirty(false)
    action?.()
  }

  const isFullBleed = useMemo(() => {
    return (
      location.pathname.startsWith("/admin/kitchen") ||
      location.pathname.startsWith("/admin/floor") ||
      location.pathname.startsWith("/admin/scheduler")
    )
  }, [location.pathname])

  return (
    <ToastProvider>
      <UnsavedChangesContext.Provider value={unsavedValue}>
        <div className="admin-layout">
          <aside className="admin-layout__sidebar">
            <div className="admin-layout__brand">
              <button
                type="button"
                className="admin-layout__icon-btn"
                onClick={() => guarded(() => navigate("/cabinet"))}
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
                  onClick={(e) => {
                    e.preventDefault()
                    guarded(() => navigate(to))
                  }}
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
                onClick={() => guarded(() => void logout())}
                aria-label="Log out"
              >
                <LuLogOut aria-hidden="true" />
              </button>
              {logoutFailed && (
                <p className="admin-layout__logout-error" role="alert">
                  Couldn't sign you out. Please try again.
                </p>
              )}
            </div>
          </aside>

          <main
            className={`admin-layout__content${isFullBleed ? " admin-layout__content--flush" : ""}`}
          >
            <Outlet />
          </main>
        </div>

        {pending && (
          <ConfirmDialog
            title="Discard changes?"
            message="You have unsaved changes. Leave without saving?"
            confirmLabel="Leave"
            tone="danger"
            onConfirm={confirmLeave}
            onClose={() => setPending(null)}
          />
        )}
      </UnsavedChangesContext.Provider>
    </ToastProvider>
  )
}

export default AdminLayout
