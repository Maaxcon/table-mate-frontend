import { Link } from "react-router-dom"

function StaffOrdersPage() {
  return (
    <div>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "12px 24px",
          borderBottom: "2px solid var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "var(--color-text)",
          }}
        >
          KITCHEN ORDERS
        </span>
        <Link
          to="/waiter-order"
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            padding: "4px 10px",
            border: "1.5px solid var(--color-border-light)",
            marginLeft: "auto",
          }}
        >
          FLOOR
        </Link>
      </nav>
      <div style={{ padding: "2rem" }}>
        <p>Kitchen order queue — coming soon.</p>
      </div>
    </div>
  )
}

export default StaffOrdersPage
