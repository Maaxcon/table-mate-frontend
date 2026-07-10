import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { apiFetch } from "@/api/client"
import { isRestaurantOpenNow } from "@/features/menu/utils"
import { useAppSelector } from "@/store/hooks"
import type { WorkingHours, WeekDay } from "@/types/workingHours"
import "./RestaurantListPage.css"

type Restaurant = {
  public_id: string
  name: string
  address: string
  phone?: string
  cover_image?: string | null
  city?: string
  cuisine?: string
  status?: string
  updated_at?: string
  settings?: {
    timezone?: string
    working_hours?: WorkingHours
    rating?: string | null
  } | null
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

function formatUpdatedAt(value?: string): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

const DAY_LABELS: Record<WeekDay, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
}

function todayKey(timezone?: string): WeekDay | null {
  if (!timezone) {
    const local = (new Date().getDay() + 6) % 7
    return (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)[local]
  }
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    })
      .format(new Date())
      .toLowerCase()
      .slice(0, 3)
    const map: Record<string, WeekDay> = {
      mon: "mon",
      tue: "tue",
      wed: "wed",
      thu: "thu",
      fri: "fri",
      sat: "sat",
      sun: "sun",
    }
    return map[weekday] ?? null
  } catch {
    return null
  }
}

function formatTodayHours(workingHours?: WorkingHours, timezone?: string): string {
  if (!workingHours) return ""
  const key = todayKey(timezone)
  if (!key) return ""
  const slot = workingHours[key]
  if (!slot) return ""
  return `${DAY_LABELS[key]} ${slot.open}-${slot.close}`
}

function formatRating(value?: string | null): string {
  if (!value) return ""
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return ""
  return `${parsed.toFixed(1)} ★`
}

function getMonogram(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
  if (words.length === 0) return "R"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase()
}

export function RestaurantListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        const updatedAtLabel = formatUpdatedAt(restaurant.updated_at)
        const ratingLabel = formatRating(restaurant.settings?.rating)
        const todayHoursLabel = formatTodayHours(
          restaurant.settings?.working_hours,
          restaurant.settings?.timezone,
        )
        const openNow =
          restaurant.settings?.working_hours && restaurant.settings?.timezone
            ? isRestaurantOpenNow(restaurant.settings.working_hours, restaurant.settings.timezone)
            : null
        return {
          ...restaurant,
          city,
          cuisine,
          updatedAtLabel,
          ratingLabel,
          todayHoursLabel,
          openNow,
        }
      }),
    [restaurants],
  )

  return (
    <main className="rlp">
      <header className="rlp__hero">
        <div className="rlp__hero-top">
          <p className="rlp__brand" aria-label="Table Mate">
            Table Mate
          </p>
          <Link to="/cabinet" className="rlp__cabinet-link" aria-label="Перейти в кабінет">
            <svg
              className="rlp__cabinet-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
            <span className="rlp__cabinet-text">Перейти в кабінет</span>
          </Link>
        </div>
        <h1 className="rlp__heading">Наші ресторани</h1>
      </header>

      {loading && (
        <div className="rlp__cards rlp__cards--skeleton" aria-label="Loading restaurants">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={`skeleton-${index}`}
              className="rlp__card rlp__card--skeleton"
              aria-hidden="true"
            >
              <div className="rlp__skeleton rlp__skeleton--visual" />
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

      {!loading && !error && enrichedRestaurants.length > 0 && (
        <div className="rlp__toolbar">
          <p className="rlp__result-count">Всього: {enrichedRestaurants.length}</p>
        </div>
      )}

      {!loading && !error && enrichedRestaurants.length > 0 && (
        <div className="rlp__cards">
          {enrichedRestaurants.map((r) => (
            <Link
              to={`/menu/${r.public_id}`}
              key={r.public_id}
              className="rlp__card"
              aria-label={`Open ${r.name}`}
            >
              <div className="rlp__card-visual" aria-hidden="true">
                {r.cover_image ? (
                  <img src={r.cover_image} alt="" className="rlp__card-image" loading="lazy" />
                ) : (
                  <div className="rlp__card-monogram">{getMonogram(r.name)}</div>
                )}
                <div className="rlp__card-veil" />
                <div className="rlp__card-chips">
                  {r.ratingLabel && <span className="rlp__chip">{r.ratingLabel}</span>}
                  {r.openNow !== null && (
                    <span
                      className={`rlp__chip ${r.openNow ? "rlp__chip--open" : "rlp__chip--closed"}`}
                    >
                      {r.openNow ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
              </div>
              <div className="rlp__card-body">
                <div className="rlp__card-head">
                  <h2 className="rlp__card-name">{r.name}</h2>
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
                  {r.todayHoursLabel && (
                    <div>
                      <dt>Today</dt>
                      <dd>{r.todayHoursLabel}</dd>
                    </div>
                  )}
                  {r.updatedAtLabel && (
                    <div>
                      <dt>Last updated</dt>
                      <dd>{r.updatedAtLabel}</dd>
                    </div>
                  )}
                </dl>

                <p className="rlp__card-open">
                  Open restaurant <span aria-hidden="true">&gt;</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
