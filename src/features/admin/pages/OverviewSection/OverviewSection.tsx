import { Link } from "react-router-dom"
import type { IconType } from "react-icons"
import {
  LuArrowRight,
  LuBookOpen,
  LuExternalLink,
  LuLayers,
  LuPlus,
  LuSettings,
  LuUsers,
  LuUtensilsCrossed,
} from "react-icons/lu"
import { useAppSelector } from "@/store/hooks"
import { useAdminOverview } from "../../hooks/useAdminOverview"
import "../../components/styles/SectionPlaceholder.css"
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
  to?: string
  href?: string
}

function ActionCard({ icon: Icon, label, desc, to, href }: ActionCardProps) {
  const inner = (
    <>
      <span className="overview-action__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="overview-action__text">
        <span className="overview-action__label">{label}</span>
        <span className="overview-action__desc">{desc}</span>
      </span>
      <LuArrowRight className="overview-action__arrow" aria-hidden="true" />
    </>
  )
  return href ? (
    <a className="overview-action" href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link className="overview-action" to={to ?? "#"}>
      {inner}
    </Link>
  )
}

function OverviewSection() {
  const { data, loading, error } = useAdminOverview()
  const user = useAppSelector((s) => s.auth.user)
  const restaurantId = user?.restaurantId ?? null
  const firstName = user?.firstName?.trim()

  return (
    <section className="admin-section admin-section--wide">
      <header className="admin-section__header">
        <h1 className="admin-section__title">
          {firstName ? `Welcome back, ${firstName}` : "Overview"}
        </h1>
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
            {restaurantId && (
              <ActionCard
                href={`/menu/${restaurantId}`}
                icon={LuExternalLink}
                label="View public menu"
                desc="See what your customers see"
              />
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default OverviewSection
