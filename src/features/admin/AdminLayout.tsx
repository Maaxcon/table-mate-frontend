import { useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LuArrowLeft,
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
  { to: "/admin/floor-plan/edit", label: "Floor Plan", icon: LuPencilRuler },
  { to: "/admin/kitchen", label: "Kitchen", icon: LuChefHat },
  { to: "/admin/floor", label: "Floor", icon: LuMap },
] as const

const useMediaQuery = (query: string) => {
  const getMatches = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    if (typeof window === "undefined") return

    const matchMedia = window.matchMedia(query)
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    if (typeof matchMedia.addEventListener === "function") {
      matchMedia.addEventListener("change", handleChange)
      return () => matchMedia.removeEventListener("change", handleChange)
    }

    matchMedia.addListener(handleChange)
    return () => matchMedia.removeListener(handleChange)
  }, [query])

  return matches
}

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, logoutFailed } = useLogout()
  const user = useAppSelector((state) => state.auth.user)

  const isAutoCollapseRange = useMediaQuery("(min-width: 721px) and (max-width: 1300px)")
  const [isUserCollapsed, setIsUserCollapsed] = useState(false)
  const isSidebarCollapsed = isAutoCollapseRange || isUserCollapsed
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
      location.pathname.startsWith("/admin/kitchen") || location.pathname.startsWith("/admin/floor")
    )
  }, [location.pathname])

  const collapseButtonLabel = isSidebarCollapsed ? "Expand side menu" : "Collapse side menu"
  const collapseButtonTitle = isAutoCollapseRange
    ? "Sidebar auto-collapses on medium screens"
    : collapseButtonLabel

  return (
    <ToastProvider>
      <UnsavedChangesContext.Provider value={unsavedValue}>
        <div
          className={["admin-layout", isSidebarCollapsed ? "admin-layout--sidebar-collapsed" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <aside className="admin-layout__sidebar">
            <div className="admin-layout__brand">
              <button
                type="button"
                className="admin-layout__icon-btn admin-layout__icon-btn--collapse"
                onClick={() => {
                  if (isAutoCollapseRange) return
                  setIsUserCollapsed((prev) => !prev)
                }}
                aria-expanded={!isSidebarCollapsed}
                aria-label={collapseButtonLabel}
                title={collapseButtonTitle}
                disabled={isAutoCollapseRange}
                aria-disabled={isAutoCollapseRange}
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
                  aria-label={label}
                  title={isSidebarCollapsed ? label : undefined}
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
