export interface KanbanItem {
  id: string
  name: string
  quantity: number
  modifiers?: string
  status: "pending" | "ready"
  categoryName?: string
  categoryColor: string
}

export interface KanbanTicket {
  id: string
  label: string
  status: "incoming" | "active" | "completed"
  items: KanbanItem[]
  startedAt: number
  guestCount: number
  serverName: string
  // Injected from a paid pre-order (inject_scheduled_preorders) rather than
  // a live order — the kitchen flags these so staff know it was ordered
  // well ahead of arrival.
  isPreorder: boolean
  completedMinutes?: number
  completedAt?: number
}

export interface BatchCount {
  label: string
  count: number
  color: string
}
