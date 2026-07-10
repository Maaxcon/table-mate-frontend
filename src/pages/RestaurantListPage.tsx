import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { apiFetch } from "@/api/client"
import { useAppSelector } from "@/store/hooks"
import "./RestaurantListPage.css"

type RestaurantStatus = "active" | "paused" | "draft"

type Restaurant = {
  public_id: string
  name: string
  address: string
  phone?: string
  city?: string
  cuisine?: string
  status?: string
  updated_at?: string
}

const STATUS_LABELS: Record<RestaurantStatus, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
}

function extractCityFromAddress(address?: string): string {
  if (!address) return ""
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return ""
  return parts[parts.length - 1]
}

function normalizeStatus(value?: string): RestaurantStatus {
  const raw = value?.trim().toLowerCase()
  if (raw === "paused") return "paused"
  if (raw === "draft") return "draft"
  return "active"
}

function formatUpdatedAt(value?: string): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

export function RestaurantListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | "all">("all")
  const [cuisineFilter, setCuisineFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const user = useAppSelector((s) => s.auth.user)
  const createRestaurantLink = user?.role === "admin" ? "/admin/restaurant" : "/"

  const loadRestaurants = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiFetch("/api/restaurants/restaurants-public/", { signal })
      if (!res.ok) throw new Error("Failed")
      const data = (await res.json()) as { results?: Restaurant[] }
      setRestaurants(data.results ?? [])
    } catch {
      if (signal?.aborted) return
      setRestaurants([])
      setError("Could not load restaurants. Please try again.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timerId = window.setTimeout(() => {
      void loadRestaurants(controller.signal)
    }, 0)
    return () => {
      window.clearTimeout(timerId)
      controller.abort()
    }
  }, [loadRestaurants])

  const retryLoadRestaurants = () => {
    setError(null)
    setLoading(true)
    void loadRestaurants()
  }

  const enrichedRestaurants = useMemo(
    () =>
      restaurants.map((restaurant) => {
        const city =
          restaurant.city?.trim() || extractCityFromAddress(restaurant.address) || "Unknown"
        const cuisine = restaurant.cuisine?.trim() || ""
        const status = normalizeStatus(restaurant.status)
        const updatedAtLabel = formatUpdatedAt(restaurant.updated_at)
        return { ...restaurant, city, cuisine, status, updatedAtLabel }
      }),
    [restaurants],
  )

  const cuisineOptions = useMemo(
    () =>
      Array.from(
        new Set(
          enrichedRestaurants
            .map((restaurant) => restaurant.cuisine)
            .filter((cuisine): cuisine is string => cuisine.length > 0),
        ),
      ).sort(),
    [enrichedRestaurants],
  )

  const cityOptions = useMemo(
    () => Array.from(new Set(enrichedRestaurants.map((restaurant) => restaurant.city))).sort(),
    [enrichedRestaurants],
  )

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enrichedRestaurants.filter((restaurant) => {
      if (statusFilter !== "all" && restaurant.status !== statusFilter) return false
      if (cuisineFilter !== "all" && restaurant.cuisine !== cuisineFilter) return false
      if (cityFilter !== "all" && restaurant.city !== cityFilter) return false
      if (!q) return true
      const haystack = `${restaurant.name} ${restaurant.address} ${restaurant.city}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [cityFilter, cuisineFilter, enrichedRestaurants, query, statusFilter])

  const resetFilters = () => {
    setQuery("")
    setStatusFilter("all")
    setCuisineFilter("all")
    setCityFilter("all")
  }

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    cuisineFilter !== "all" ||
    cityFilter !== "all"

  return (
    <main className="rlp">
      <header className="rlp__hero">
        <div className="rlp__hero-copy">
          <h1 className="rlp__heading">Restaurants Directory</h1>
          <p className="rlp__subtitle">
            Browse available restaurants, open their menus, and quickly jump to your own workspace.
          </p>
        </div>
        <div className="rlp__hero-actions">
          <Link to={createRestaurantLink} className="rlp__cta-link">
            Add restaurant
          </Link>
          {user && (
            <Link to="/cabinet" className="rlp__profile-link">
              My Cabinet
            </Link>
          )}
        </div>
      </header>

      <section className="rlp__filters" aria-label="Restaurants filters">
        <label className="rlp__field rlp__field--search">
          <span className="rlp__field-label">Search</span>
          <input
            type="search"
            placeholder="Search by name or city"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rlp__input"
            disabled={loading}
          />
        </label>

        <label className="rlp__field">
          <span className="rlp__field-label">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RestaurantStatus | "all")}
            className="rlp__select"
            disabled={loading}
          >
            <option value="all">All statuses</option>
            <option value="active">{STATUS_LABELS.active}</option>
            <option value="paused">{STATUS_LABELS.paused}</option>
            <option value="draft">{STATUS_LABELS.draft}</option>
          </select>
        </label>

        <label className="rlp__field">
          <span className="rlp__field-label">Cuisine</span>
          <select
            value={cuisineFilter}
            onChange={(event) => setCuisineFilter(event.target.value)}
            className="rlp__select"
            disabled={loading}
          >
            <option value="all">All cuisines</option>
            {cuisineOptions.map((cuisine) => (
              <option key={cuisine} value={cuisine}>
                {cuisine}
              </option>
            ))}
          </select>
        </label>

        <label className="rlp__field">
          <span className="rlp__field-label">City</span>
          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            className="rlp__select"
            disabled={loading}
          >
            <option value="all">All cities</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="rlp__reset" onClick={resetFilters}>
          Reset filters
        </button>
      </section>

      {loading && (
        <div className="rlp__cards rlp__cards--skeleton" aria-label="Loading restaurants">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={`skeleton-${index}`}
              className="rlp__card rlp__card--skeleton"
              aria-hidden="true"
            >
              <div className="rlp__skeleton rlp__skeleton--title" />
              <div className="rlp__skeleton rlp__skeleton--line" />
              <div className="rlp__skeleton rlp__skeleton--line short" />
              <div className="rlp__skeleton rlp__skeleton--facts" />
              <div className="rlp__skeleton rlp__skeleton--cta" />
            </article>
          ))}
        </div>
      )}

      {!loading && error && (
        <section className="rlp__state" role="alert">
          <h2 className="rlp__state-title">Couldn’t load restaurants</h2>
          <p className="rlp__state-text">{error}</p>
          <div className="rlp__state-actions">
            <button
              type="button"
              className="rlp__state-button rlp__state-button--primary"
              onClick={retryLoadRestaurants}
            >
              Retry
            </button>
          </div>
        </section>
      )}

      {!loading && !error && enrichedRestaurants.length === 0 && (
        <section className="rlp__state">
          <h2 className="rlp__state-title">No restaurants yet</h2>
          <p className="rlp__state-text">
            Create your first restaurant to start building the menu and bookings.
          </p>
          <div className="rlp__state-actions">
            <Link
              to={createRestaurantLink}
              className="rlp__state-button rlp__state-button--primary"
            >
              Create restaurant
            </Link>
          </div>
        </section>
      )}

      {!loading && !error && enrichedRestaurants.length > 0 && filteredRestaurants.length === 0 && (
        <section className="rlp__state">
          <h2 className="rlp__state-title">No results</h2>
          <p className="rlp__state-text">No restaurants match the current filters.</p>
          <div className="rlp__state-actions">
            <button
              type="button"
              className="rlp__state-button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset filters
            </button>
          </div>
        </section>
      )}

      {!loading && !error && filteredRestaurants.length > 0 && (
        <div className="rlp__toolbar">
          <p className="rlp__result-count">
            Showing {filteredRestaurants.length} of {enrichedRestaurants.length}
          </p>
        </div>
      )}

      {!loading && !error && filteredRestaurants.length > 0 && (
        <div className="rlp__cards">
          {filteredRestaurants.map((r) => (
            <Link
              to={`/menu/${r.public_id}`}
              key={r.public_id}
              className="rlp__card"
              aria-label={`Open ${r.name}`}
            >
              <div className="rlp__card-head">
                <h2 className="rlp__card-name">{r.name}</h2>
                <span className={`rlp__status rlp__status--${r.status}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="rlp__card-address">{r.address}</p>
              {r.cuisine && <p className="rlp__card-meta">{r.cuisine}</p>}

              <dl className="rlp__card-facts">
                <div>
                  <dt>City</dt>
                  <dd>{r.city}</dd>
                </div>
                {r.cuisine && (
                  <div>
                    <dt>Cuisine</dt>
                    <dd>{r.cuisine}</dd>
                  </div>
                )}
                {r.updatedAtLabel && (
                  <div>
                    <dt>Last updated</dt>
                    <dd>{r.updatedAtLabel}</dd>
                  </div>
                )}
              </dl>

              <p className="rlp__card-open">Open restaurant</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
