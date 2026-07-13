import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import type { IconType } from "react-icons"
import {
  LuArrowRight,
  LuBookOpen,
  LuCircleAlert,
  LuCircleCheck,
  LuExternalLink,
  LuLayers,
  LuPlus,
  LuSettings,
  LuUsers,
  LuUtensilsCrossed,
} from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { fetchRestaurant } from "@/features/menu/api"
import type { PublicRestaurant } from "@/features/menu/types"
import { isRestaurantOpenNow } from "@/features/menu/utils"
import { useAdminOverview } from "@/features/admin/hooks/useAdminOverview"
import { useMenuData } from "@/features/admin/hooks/useMenuData"
import { useResource } from "@/features/admin/hooks/useResource"
import BarChart from "@/features/admin/components/BarChart"
import {
  deriveDishesByCategory,
  derivePriceBuckets,
  deriveIssues,
  deriveTopLiked,
} from "./insights"
import "@/features/admin/components/styles/SectionPlaceholder.css"
import "./overview.css"

type StatCardProps = {
  tone: "violet" | "blue" | "green" | "amber"
  icon: IconType
  value: number
  label: string
  sub: string
}

function StatCard({ tone, icon: Icon, value, label, sub }: StatCardProps) {
  return (
    <div className={`overview-card overview-card--${tone}`}>
      <span className="overview-card__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="overview-card__value">{value}</span>
      <span className="overview-card__label">{label}</span>
      <span className="overview-card__sub">{sub}</span>
    </div>
  )
}

type ActionCardProps = {
  icon: IconType
  label: string
  desc: string
  to: string
}

function ActionCard({ icon: Icon, label, desc, to }: ActionCardProps) {
  return (
    <Link className="overview-action" to={to}>
      <span className="overview-action__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="overview-action__text">
        <span className="overview-action__label">{label}</span>
        <span className="overview-action__desc">{desc}</span>
      </span>
      <LuArrowRight className="overview-action__arrow" aria-hidden="true" />
    </Link>
  )
}

function OverviewSection() {
  const { data, loading, error } = useAdminOverview()
  const user = useAppSelector((s) => s.auth.user)
  const restaurantId = user?.restaurantId ?? null
  const firstName = user?.firstName?.trim()

  // Pull working hours + timezone from the public restaurant endpoint to show
  // whether the restaurant is open right now.
  const loadRestaurant = useCallback(() => fetchRestaurant(restaurantId as string), [restaurantId])
  const { data: restaurant } = useResource<PublicRestaurant>(loadRestaurant, {
    enabled: restaurantId !== null,
  })
  const settings = restaurant?.settings ?? null
  const openNow = settings ? isRestaurantOpenNow(settings.working_hours, settings.timezone) : null

  const { data: menuData } = useMenuData()
  const issues = useMemo(() => (menuData ? deriveIssues(menuData) : null), [menuData])
  const dishesByCategory = useMemo(
    () => (menuData ? deriveDishesByCategory(menuData) : []),
    [menuData],
  )
  const priceBuckets = useMemo(() => (menuData ? derivePriceBuckets(menuData) : []), [menuData])
  const topLiked = useMemo(() => (menuData ? deriveTopLiked(menuData) : []), [menuData])

  return (
    <section className="admin-section admin-section--wide">
      <header className="admin-section__header">
        <div className="overview-titlebar">
          <h1 className="admin-section__title">
            {firstName ? `Welcome back, ${firstName}` : "Overview"}
          </h1>
          {openNow !== null && (
            <span className={`overview-status overview-status--${openNow ? "open" : "closed"}`}>
              <span className="overview-status__dot" aria-hidden="true" />
              {openNow ? "Open now" : "Closed"}
            </span>
          )}
          {restaurantId && (
            <Link className="overview-restaurant-link" to={`/menu/${restaurantId}`}>
              <LuExternalLink aria-hidden="true" />
              Перейти до ресторану
            </Link>
          )}
        </div>
        <p className="admin-section__description">A quick snapshot of your restaurant.</p>
      </header>

      {loading ? (
        <div className="overview-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overview-card overview-card--skeleton" />
          ))}
        </div>
      ) : error || !data ? (
        <p className="overview-error">{error ?? "Could not load the overview."}</p>
      ) : (
        <>
          <div className="overview-grid">
            <StatCard
              tone="violet"
              icon={LuBookOpen}
              value={data.menusActive}
              label="Active menus"
              sub={`of ${data.menusTotal} total`}
            />
            <StatCard
              tone="blue"
              icon={LuUtensilsCrossed}
              value={data.dishesTotal}
              label="Dishes"
              sub={`${data.dishesTotal - data.dishesHidden} visible · ${data.dishesHidden} hidden`}
            />
            <StatCard
              tone="green"
              icon={LuLayers}
              value={data.categoriesTotal}
              label="Categories"
              sub="across all menus"
            />
            <StatCard
              tone="amber"
              icon={LuUsers}
              value={data.staffActive}
              label="Active staff"
              sub={`of ${data.staffTotal} total`}
            />
          </div>

          {issues !== null && (
            <>
              <h2 className="overview-subtitle">Needs attention</h2>
              {issues.length === 0 ? (
                <p className="overview-allgood">
                  <LuCircleCheck aria-hidden="true" />
                  Everything looks good — nothing needs fixing.
                </p>
              ) : (
                <ul className="overview-issues">
                  {issues.map((issue) => (
                    <li key={issue.id}>
                      <Link className="overview-issue" to={issue.to}>
                        <LuCircleAlert className="overview-issue__icon" aria-hidden="true" />
                        <span className="overview-issue__label">{issue.label}</span>
                        <span className="overview-issue__fix">
                          Fix
                          <LuArrowRight aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {menuData && (
            <>
              <h2 className="overview-subtitle">Insights</h2>
              <div className="overview-charts">
                <div className="overview-chart">
                  <h3 className="overview-chart__title">Dishes by category</h3>
                  <BarChart data={dishesByCategory} emptyText="No dishes yet" />
                </div>
                <div className="overview-chart">
                  <h3 className="overview-chart__title">Price distribution</h3>
                  <BarChart data={priceBuckets} emptyText="No priced dishes yet" />
                </div>
                <div className="overview-chart">
                  <h3 className="overview-chart__title">Most liked dishes</h3>
                  <BarChart data={topLiked} emptyText="No likes yet" />
                </div>
              </div>
            </>
          )}

          <h2 className="overview-subtitle">Quick actions</h2>
          <div className="overview-actions">
            <ActionCard
              to="/admin/menu"
              icon={LuPlus}
              label="Add a dish"
              desc="Create a new menu item"
            />
            <ActionCard
              to="/admin/menu"
              icon={LuUtensilsCrossed}
              label="Manage menu"
              desc="Menus, categories and dishes"
            />
            <ActionCard
              to="/admin/staff"
              icon={LuUsers}
              label="Manage staff"
              desc="Invite and manage employees"
            />
            <ActionCard
              to="/admin/settings"
              icon={LuSettings}
              label="Settings"
              desc="Currency, tax, locale and hours"
            />
          </div>
        </>
      )}
    </section>
  )
}

export default OverviewSection
