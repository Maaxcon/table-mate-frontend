import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LuArrowLeft,
  LuChefHat,
  LuChevronLeft,
  LuChevronRight,
  LuLayoutDashboard,
  LuLogOut,
  LuMap,
  LuPencilRuler,
  LuSettings,
  LuStore,
  LuUsers,
  LuUtensilsCrossed,
  LuX,
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

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, logoutFailed } = useLogout()
  const user = useAppSelector((state) => state.auth.user)

  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const unsavedValue = useMemo(() => ({ setDirty }), [])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  /* ── Swipe to open/close ── */
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipingRef = useRef(false)

  useEffect(() => {
    const el = document.documentElement

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      swipingRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
      if (dx > dy && dx > 10) swipingRef.current = true
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!swipingRef.current) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const threshold = 50

      if (!sidebarOpen && touchStartX.current <= 30 && dx > threshold) {
        setSidebarOpen(true)
      } else if (sidebarOpen && dx < -threshold) {
        setSidebarOpen(false)
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: true })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [sidebarOpen])

  const guarded = (action: () => void) => {
    if (dirty) setPending(() => action)
    else {
      closeSidebar()
      action()
    }
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

  const sidebarClassName = [
    "admin-layout__sidebar",
    sidebarOpen ? "admin-layout__sidebar--open" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <ToastProvider>
      <UnsavedChangesContext.Provider value={unsavedValue}>
        <div className="admin-layout">
          <aside className={sidebarClassName}>
            <div className="admin-layout__sidebar-header">
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
              <button
                type="button"
                className="admin-layout__sidebar-close"
                onClick={closeSidebar}
                aria-label="Close sidebar"
              >
                <LuX aria-hidden="true" />
              </button>
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

          {sidebarOpen && (
            <div className="admin-layout__backdrop" role="presentation" onClick={closeSidebar} />
          )}

          <button
            type="button"
            className={`admin-layout__toggle${sidebarOpen ? " admin-layout__toggle--open" : ""}`}
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <LuChevronLeft aria-hidden="true" />
            ) : (
              <LuChevronRight aria-hidden="true" />
            )}
          </button>

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
