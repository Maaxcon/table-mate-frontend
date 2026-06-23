interface KanbanFooterProps {
  incomingCount: number
  activeCount: number
  completedCount: number
  avgPrepTimeSeconds: number | null
}

function formatPrepTime(seconds: number | null): string {
  if (seconds === null) return "—"
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

export function KanbanFooter({
  incomingCount,
  activeCount,
  completedCount,
  avgPrepTimeSeconds,
}: KanbanFooterProps) {
  return (
    <footer className="kanban__footer">
      <span>INCOMING: {incomingCount}</span>
      <span>ACTIVE: {activeCount}</span>
      <span>COMPLETED (TODAY): {completedCount}</span>
      <span>AVG PREP TIME: {formatPrepTime(avgPrepTimeSeconds)}</span>
    </footer>
  )
}
