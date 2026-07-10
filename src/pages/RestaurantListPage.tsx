import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { apiFetch } from "@/api/client"
import { useAppSelector } from "@/store/hooks"
import "./RestaurantListPage.css"

type Restaurant = {
  public_id: string
  name: string
  address: string
  phone?: string
}

export function RestaurantListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAppSelector((s) => s.auth.user)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch("/api/restaurants/restaurants-public/", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed")
        const data = (await res.json()) as { results?: Restaurant[] }
        setRestaurants(data.results ?? [])
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <main className="rlp">
        <p className="rlp__loading">Loading restaurants...</p>
      </main>
    )
  }

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
          <Link to="/" className="rlp__cta-link">
            Add restaurant
          </Link>
          {user && (
            <Link to="/cabinet" className="rlp__profile-link">
              My Cabinet
            </Link>
          )}
        </div>
      </header>

      {restaurants.length === 0 && <p className="rlp__empty">No restaurants available.</p>}

      <div className="rlp__grid">
        {restaurants.map((r) => (
          <Link to={`/menu/${r.public_id}`} key={r.public_id} className="rlp__card">
            <h2 className="rlp__card-name">{r.name}</h2>
            <p className="rlp__card-address">{r.address}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
