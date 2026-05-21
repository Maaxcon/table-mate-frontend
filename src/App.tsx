import { useEffect, useState } from "react"
import "./App.css"
import { env } from "./config/env"
import { pingApi } from "./api/ping"

type ApiPingState = "pending" | "success" | "failure"

const runtimeValues = [
  {
    label: "API base URL",
    value: env.apiBaseUrl ?? "Not configured",
  },
  {
    label: "WebSocket URL",
    value: env.wsUrl ?? "Not configured",
  },
  {
    label: "Google client ID",
    value: env.googleClientId ?? "Not configured",
  },
]

function App() {
  const [apiPingState, setApiPingState] = useState<ApiPingState>("pending")
  const [apiPingDetails, setApiPingDetails] = useState<string>("Checking…")

  useEffect(() => {
    let mounted = true

    async function runPing() {
      const result = await pingApi()
      if (!mounted) return

      setApiPingState(result.ok ? "success" : "failure")
      setApiPingDetails(result.statusText)
    }

    runPing()

    return () => {
      mounted = false
    }
  }, [])

  const pingLabel =
    apiPingState === "pending"
      ? "API ping pending"
      : apiPingState === "success"
        ? "API reachable"
        : "API unreachable"

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">TableMate Frontend</p>
        <div className="hero-copy">
          <h1>Foundation shell ready for env, API, and type generation.</h1>
          <p className="hero-text">
            This placeholder replaces the default Vite starter so the project can prove the frontend
            shell is booting in the shape we actually need for development.
          </p>
        </div>

        <div className="status-row">
          <span className="status-pill status-pill--ready">App shell online</span>
          <span
            className={`status-pill ${
              apiPingState === "success"
                ? "status-pill--ready"
                : apiPingState === "failure"
                  ? "status-pill--error"
                  : ""
            }`}
          >
            {pingLabel}
          </span>
          <span className="status-pill status-pill--ready">Type-gen ready</span>
        </div>

        <div className="status-row">
          <span className="status-pill">{apiPingDetails}</span>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Runtime Config</h2>
            <p>These values are centralized through the frontend env config module.</p>
          </div>

          <dl className="config-list">
            {runtimeValues.map((item) => (
              <div className="config-row" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
    </main>
  )
}

export default App
