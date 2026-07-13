import { Fragment, type ReactElement } from "react"
import { Link, useLocation } from "react-router-dom"
import { LuCalendarCheck, LuClipboardList, LuLayoutDashboard } from "react-icons/lu"
import logo from "@/assets/logo.png"
import type { AuthUser } from "@/store/auth/authSlice"
import { setPostLoginRedirect } from "@/store/auth/postLoginRedirect"
import type { PublicRestaurantSettings } from "@/features/menu/types"
import { getCurrencySymbol, isRestaurantOpenNow } from "@/features/menu/utils"
import { menuStrings } from "@/features/menu/strings"

type MenuHeaderProps = {
  name: string | null
  coverImage: string | null
  settings: PublicRestaurantSettings | null
  user: AuthUser | null
  restaurantId: string | null
  onSignOut: () => void
}

/** Top bar (brand + auth) and the restaurant hero with its meta pills. */
function MenuHeader({
  name,
  coverImage,
  settings,
  user,
  restaurantId,
  onSignOut,
}: MenuHeaderProps) {
  const location = useLocation()
  const currencySymbol = settings ? getCurrencySymbol(settings.currency) : ""
  const priceBand = settings
    ? currencySymbol.repeat(Math.max(1, Math.min(4, settings.price_band)))
    : null
  const rating = settings?.rating ?? null
  const etaMin = settings?.eta_min_minutes ?? null
  const etaMax = settings?.eta_max_minutes ?? null
  const openNow = settings ? isRestaurantOpenNow(settings.working_hours, settings.timezone) : null
  const isOwnRestaurantStaff =
    Boolean(restaurantId) &&
    user?.restaurantId === restaurantId &&
    (user.role === "admin" || user.role === "waiter")
  const staffArea =
    user?.role === "admin"
      ? { to: "/admin", label: menuStrings.header.adminArea, icon: LuLayoutDashboard }
      : { to: "/waiter-order", label: menuStrings.header.waiterArea, icon: LuClipboardList }

  const rememberMenuBeforeSignIn = () => {
    setPostLoginRedirect(`${location.pathname}${location.search}${location.hash}`)
  }

  const pills = [
    openNow !== null ? (
      <span
        key="open"
        className={`menu-page__hero-pill${openNow ? " menu-page__hero-pill--open" : " menu-page__hero-pill--closed"}`}
      >
        {openNow ? menuStrings.hero.openNow : menuStrings.hero.closedNow}
      </span>
    ) : null,
    priceBand !== null ? (
      <span key="price-band" className="menu-page__hero-pill">
        {priceBand}
      </span>
    ) : null,
    rating !== null ? (
      <span key="rating" className="menu-page__hero-pill">
        {Number(rating).toFixed(1)} ★
      </span>
    ) : null,
    etaMin !== null && etaMax !== null ? (
      <span key="eta" className="menu-page__hero-pill">{`${etaMin}-${etaMax} min`}</span>
    ) : null,
  ].filter((pill): pill is ReactElement => pill !== null)

  return (
    <header className="menu-page__header">
      <div className="menu-page__topbar">
        <div className="menu-page__brand">
          <img src={logo} alt="TableMate" className="menu-page__logo" />
        </div>
        <div className="menu-page__topbar-right">
          {isOwnRestaurantStaff && (
            <Link to={staffArea.to} className="menu-page__staff-btn">
              <staffArea.icon size={16} aria-hidden="true" />
              <span>{staffArea.label}</span>
            </Link>
          )}
          {restaurantId && (
            <Link to={`/${restaurantId}/book`} className="menu-page__book-btn">
              <LuCalendarCheck size={16} aria-hidden="true" />
              <span>{menuStrings.header.book}</span>
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/cabinet"
                className="menu-page__avatar"
                title={`${user.firstName} ${user.lastName}`}
                aria-label={menuStrings.header.openCabinet}
              >
                {user.firstName[0]}
                {user.lastName[0]}
              </Link>
              <button className="menu-page__signout" onClick={onSignOut}>
                {menuStrings.header.signOut}
              </button>
            </>
          ) : (
            <Link to="/" className="menu-page__signin" onClick={rememberMenuBeforeSignIn}>
              {menuStrings.header.signIn}
            </Link>
          )}
        </div>
      </div>
      <div
        className={`menu-page__hero${coverImage ? " menu-page__hero--has-cover" : ""}`}
        style={
          coverImage ? ({ "--hero-cover": `url(${coverImage})` } as React.CSSProperties) : undefined
        }
      >
        <p className="menu-page__label">{menuStrings.hero.label}</p>
        <h1 className="menu-page__title">{name}</h1>
        <p className="menu-page__hero-description">{menuStrings.hero.tagline}</p>
        <div className="menu-page__hero-meta">
          {pills.map((pill, i) => (
            <Fragment key={pill.key}>
              {i > 0 && <span className="menu-page__hero-dot">·</span>}
              {pill}
            </Fragment>
          ))}
        </div>
      </div>
    </header>
  )
}

export default MenuHeader
