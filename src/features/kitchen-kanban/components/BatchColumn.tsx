import type { BatchCount } from "../types"

interface BatchColumnProps {
  batches: BatchCount[]
}

export function BatchColumn({ batches }: BatchColumnProps) {
  return (
    <div className="kanban__col kanban__col--batch">
      <div className="kanban__col-header">
        <span className="kanban__col-title">BATCH VIEW</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </div>
      <div className="kanban__col-body">
        {batches.map((batch) => (
          <div key={batch.label} className="kanban-card kanban-card--batch">
            <span className="kanban-card__batch-label">{batch.label}</span>
            <span className="kanban-card__batch-count">{batch.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
