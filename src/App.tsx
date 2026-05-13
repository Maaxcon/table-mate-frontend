import "./App.css"
import { env } from "./config/env"

type RuntimeValue = {
  label: string
  value: string
}

const runtimeValues: RuntimeValue[] = [
  {
    label: "API base URL",
    value: env.apiBaseUrl,
  },
  {
    label: "WebSocket URL",
    value: env.wsUrl,
  },
  {
    label: "Google client ID",
    value: env.googleClientId,
  },
]

function App() {
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
          <span className="status-pill">API ping pending</span>
          <span className="status-pill">Type-gen pending</span>
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
