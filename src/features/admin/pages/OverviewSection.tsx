import { useAdminOverview } from "../hooks/useAdminOverview"
import "../components/SectionPlaceholder.css"
import "../components/overview.css"

function OverviewSection() {
  const { data, loading, error } = useAdminOverview()

  return (
    <section className="admin-section admin-section--wide">
      <header className="admin-section__header">
        <h1 className="admin-section__title">Overview</h1>
        <p className="admin-section__description">A quick snapshot of your restaurant.</p>
      </header>

      {loading ? (
        <p className="admin-section__description">Loading…</p>
      ) : error || !data ? (
        <p className="overview-error">{error ?? "Could not load the overview."}</p>
      ) : (
        <div className="overview-grid">
          <div className="overview-card">
            <span className="overview-card__value">{data.menusActive}</span>
            <span className="overview-card__label">Active menus</span>
            <span className="overview-card__sub">of {data.menusTotal} total</span>
          </div>
          <div className="overview-card">
            <span className="overview-card__value">{data.dishesTotal}</span>
            <span className="overview-card__label">Dishes</span>
            <span className="overview-card__sub">{data.dishesHidden} hidden from customers</span>
          </div>
          <div className="overview-card">
            <span className="overview-card__value">{data.categoriesTotal}</span>
            <span className="overview-card__label">Categories</span>
            <span className="overview-card__sub">across all menus</span>
          </div>
          <div className="overview-card">
            <span className="overview-card__value">{data.staffActive}</span>
            <span className="overview-card__label">Active staff</span>
            <span className="overview-card__sub">of {data.staffTotal} total</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default OverviewSection
