export interface KanbanItem {
  id: string
  name: string
  quantity: number
  modifiers?: string
  status: "pending" | "ready"
}

export interface KanbanTicket {
  id: string
  label: string
  status: "incoming" | "active" | "completed"
  items: KanbanItem[]
  startedAt: number
  guestCount: number
  serverName: string
  completedMinutes?: number
}

export interface BatchCount {
  label: string
  count: number
}
