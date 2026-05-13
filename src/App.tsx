import "./App.css"

type RuntimeValue = {
  label: string
  value: string
}

const runtimeValues: RuntimeValue[] = [
  {
    label: "API base URL",
    value: import.meta.env.VITE_API_BASE_URL ?? "Not configured",
  },
  {
    label: "WebSocket URL",
    value: import.meta.env.VITE_WS_URL ?? "Not configured",
  },
  {
    label: "Google client ID",
    value: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "Not configured",
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
            <p>These values come from `import.meta.env`.</p>
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
