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
import { useAdminStrings } from "@/features/admin/strings"
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
  const strings = useAdminStrings()

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
          <h1 className="admin-section__title">{strings.overview.title(firstName)}</h1>
          {openNow !== null && (
            <span className={`overview-status overview-status--${openNow ? "open" : "closed"}`}>
              <span className="overview-status__dot" aria-hidden="true" />
              {openNow ? strings.overview.status.open : strings.overview.status.closed}
            </span>
          )}
          {restaurantId && (
            <Link className="overview-restaurant-link" to={`/menu/${restaurantId}`}>
              <LuExternalLink aria-hidden="true" />
              {strings.overview.viewRestaurant}
            </Link>
          )}
        </div>
        <p className="admin-section__description">{strings.overview.description}</p>
      </header>

      {loading ? (
        <div className="overview-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overview-card overview-card--skeleton" />
          ))}
        </div>
      ) : error || !data ? (
        <p className="overview-error">{error ?? strings.overview.error}</p>
      ) : (
        <>
          <div className="overview-grid">
            <StatCard
              tone="violet"
              icon={LuBookOpen}
              value={data.menusActive}
              label={strings.overview.stats.menus.label}
              sub={strings.overview.stats.menus.sub(data.menusTotal)}
            />
            <StatCard
              tone="blue"
              icon={LuUtensilsCrossed}
              value={data.dishesTotal}
              label={strings.overview.stats.dishes.label}
              sub={strings.overview.stats.dishes.sub(
                data.dishesTotal - data.dishesHidden,
                data.dishesHidden,
              )}
            />
            <StatCard
              tone="green"
              icon={LuLayers}
              value={data.categoriesTotal}
              label={strings.overview.stats.categories.label}
              sub={strings.overview.stats.categories.sub}
            />
            <StatCard
              tone="amber"
              icon={LuUsers}
              value={data.staffActive}
              label={strings.overview.stats.staff.label}
              sub={strings.overview.stats.staff.sub(data.staffTotal)}
            />
          </div>

          {issues !== null && (
            <>
              <h2 className="overview-subtitle">{strings.overview.needsAttention.title}</h2>
              {issues.length === 0 ? (
                <p className="overview-allgood">
                  <LuCircleCheck aria-hidden="true" />
                  {strings.overview.needsAttention.empty}
                </p>
              ) : (
                <ul className="overview-issues">
                  {issues.map((issue) => (
                    <li key={issue.id}>
                      <Link className="overview-issue" to={issue.to}>
                        <LuCircleAlert className="overview-issue__icon" aria-hidden="true" />
                        <span className="overview-issue__label">{issue.label}</span>
                        <span className="overview-issue__fix">
                          {strings.overview.needsAttention.fix}
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
              <h2 className="overview-subtitle">{strings.overview.insights.title}</h2>
              <div className="overview-charts">
                <div className="overview-chart">
                  <h3 className="overview-chart__title">
                    {strings.overview.insights.categoriesTitle}
                  </h3>
                  <BarChart
                    data={dishesByCategory}
                    emptyText={strings.overview.insights.categoriesEmpty}
                  />
                </div>
                <div className="overview-chart">
                  <h3 className="overview-chart__title">{strings.overview.insights.priceTitle}</h3>
                  <BarChart data={priceBuckets} emptyText={strings.overview.insights.priceEmpty} />
                </div>
                <div className="overview-chart">
                  <h3 className="overview-chart__title">{strings.overview.insights.likesTitle}</h3>
                  <BarChart data={topLiked} emptyText={strings.overview.insights.likesEmpty} />
                </div>
              </div>
            </>
          )}

          <h2 className="overview-subtitle">{strings.overview.actions.title}</h2>
          <div className="overview-actions">
            <ActionCard
              to="/admin/menu"
              icon={LuPlus}
              label={strings.overview.actions.addDish.label}
              desc={strings.overview.actions.addDish.desc}
            />
            <ActionCard
              to="/admin/menu"
              icon={LuUtensilsCrossed}
              label={strings.overview.actions.manageMenu.label}
              desc={strings.overview.actions.manageMenu.desc}
            />
            <ActionCard
              to="/admin/staff"
              icon={LuUsers}
              label={strings.overview.actions.manageStaff.label}
              desc={strings.overview.actions.manageStaff.desc}
            />
            <ActionCard
              to="/admin/settings"
              icon={LuSettings}
              label={strings.overview.actions.settings.label}
              desc={strings.overview.actions.settings.desc}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default OverviewSection
