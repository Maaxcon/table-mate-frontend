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
    apiFetch("/api/restaurants/", { signal: controller.signal })
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
      <header className="rlp__bar">
        <h1 className="rlp__heading">Restaurants</h1>
        {user && (
          <Link to="/cabinet" className="rlp__profile-link">
            My Cabinet
          </Link>
        )}
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
