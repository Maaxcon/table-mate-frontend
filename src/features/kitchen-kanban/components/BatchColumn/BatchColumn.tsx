import "./BatchColumn.css"
import type { CSSProperties } from "react"
import { LuLayoutGrid } from "react-icons/lu"
import type { BatchCount } from "../../types"
import { useAdminStrings } from "@/features/admin/strings"

interface BatchColumnProps {
  batches: BatchCount[]
}

export function BatchColumn({ batches }: BatchColumnProps) {
  const strings = useAdminStrings()
  return (
    <div className="kanban__col kanban__col--batch">
      <div className="kanban__col-header">
        <span className="kanban__col-title kanban__col-title--dark">
          {strings.kitchen.batch.title}
        </span>
        <LuLayoutGrid className="kanban__col-icon" aria-hidden="true" />
      </div>
      <div className="kanban__col-body">
        {batches.length === 0 && (
          <div className="kanban-card kanban-card--empty">{strings.kitchen.batch.empty}</div>
        )}
        {batches.map((batch) => (
          <div
            key={batch.label}
            className="kanban-card kanban-card--batch"
            style={{ "--batch-accent": batch.color } as CSSProperties}
          >
            <span className="kanban-card__batch-indicator" aria-hidden="true" />
            <span className="kanban-card__batch-label">{batch.label}</span>
            <span className="kanban-card__batch-count">{batch.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
