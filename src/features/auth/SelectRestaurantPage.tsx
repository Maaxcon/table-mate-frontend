import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LuStore } from "react-icons/lu"
import { apiFetch } from "@/api/client"
import { clearAuth, setAccessToken, setUser } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import type { MeResponse, UserRole } from "@/features/auth/types"
import "./SelectRestaurantPage.css"

/** Where each role lands after the restaurant context is set. */
function landingForRole(role: UserRole): string {
  if (role === "admin") return "/admin"
  if (role === "waiter") return "/waiter-order"
  return "/cabinet"
}

function SelectRestaurantPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      try {
        const res = await apiFetch("/api/auth/me/", { signal })
        if (!res.ok) throw new Error("Could not load your account.")
        const data = (await res.json()) as MeResponse
        setMe(data)

        if (data.restaurant_public_id) {
          const r = await apiFetch(
            `/api/restaurants/restaurants-public/${data.restaurant_public_id}/`,
            { signal },
          )
          if (r.ok) {
            const restaurant = (await r.json()) as { name?: string }
            setRestaurantName(restaurant.name ?? null)
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load your account. Please sign in again.")
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const handleContinue = async () => {
    if (!me?.restaurant_public_id) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch("/api/auth/google/context/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: me.restaurant_public_id }),
      })
      if (!res.ok) throw new Error("Could not select this restaurant.")
      const { access } = (await res.json()) as { access: string }
      dispatch(setAccessToken(access))
      dispatch(
        setUser({
          email: me.email,
          firstName: me.first_name,
          lastName: me.last_name,
          role: me.role,
          restaurantId: me.restaurant_public_id,
        }),
      )
      navigate(landingForRole(me.role), { replace: true })
    } catch {
      setError("Could not select this restaurant. Please try again.")
      setSubmitting(false)
    }
  }

  const handleSignOut = () => {
    dispatch(clearAuth())
    navigate("/", { replace: true })
  }

  return (
    <main className="select-restaurant">
      <div className="select-restaurant__card">
        <div className="select-restaurant__icon">
          <LuStore aria-hidden="true" />
        </div>
        <h1 className="select-restaurant__title">Choose your restaurant</h1>

        {loading ? (
          <p className="select-restaurant__hint">Loading…</p>
        ) : error ? (
          <>
            <p className="select-restaurant__error">{error}</p>
            <button type="button" className="select-restaurant__btn" onClick={handleSignOut}>
              Back to sign in
            </button>
          </>
        ) : me?.restaurant_public_id ? (
          <>
            <p className="select-restaurant__hint">
              You are signed in as <strong>{me.first_name || me.email}</strong> ({me.role}).
            </p>
            <button
              type="button"
              className="select-restaurant__option"
              onClick={() => void handleContinue()}
              disabled={submitting}
            >
              {restaurantName ?? "Continue"}
            </button>
            <button
              type="button"
              className="select-restaurant__link"
              onClick={handleSignOut}
              disabled={submitting}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="select-restaurant__hint">
              Your account is not linked to any restaurant yet. Please contact an administrator.
            </p>
            <button type="button" className="select-restaurant__btn" onClick={handleSignOut}>
              Back to sign in
            </button>
          </>
        )}
      </div>
    </main>
  )
}

export default SelectRestaurantPage
