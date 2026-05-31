import { Link } from "react-router-dom"
import { apiFetch } from "@/api/client"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

function HomePlaceholderPage() {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" })
    } finally {
      dispatch(clearAuth())
    }
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>
        {user?.firstName} {user?.lastName}
      </h1>
      <p>Role: {user?.role}</p>
      <p>
        <Link to="/cabinet">My cabinet</Link>
      </p>
      <button onClick={() => void handleLogout()}>Logout</button>
    </main>
  )
}

export default HomePlaceholderPage
