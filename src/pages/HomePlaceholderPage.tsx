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
    <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h1>
        {user?.firstName} {user?.lastName}
      </h1>
      <p>Role: {user?.role}</p>
      <Link
        to="/reservations"
        style={{
          display: "inline-flex",
          padding: "12px 24px",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "0.82rem",
          letterSpacing: "0.08em",
          width: "fit-content",
        }}
      >
        BOOK A TABLE
      </Link>
      <button
        onClick={() => void handleLogout()}
        style={{ width: "fit-content", padding: "12px 24px", cursor: "pointer" }}
      >
        Logout
      </button>
    </main>
  )
}

export default HomePlaceholderPage
