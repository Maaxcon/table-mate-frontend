interface KanbanFooterProps {
  incomingCount: number
  activeCount: number
  completedCount: number
}

export function KanbanFooter({ incomingCount, activeCount, completedCount }: KanbanFooterProps) {
  return (
    <footer className="kanban__footer">
      <span>INCOMING: {incomingCount}</span>
      <span>ACTIVE: {activeCount}</span>
      <span>COMPLETED (TODAY): {completedCount}</span>
      <span>AVG PREP TIME: 28m</span>
    </footer>
  )
}
