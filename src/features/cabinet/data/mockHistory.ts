import type { HistoryEntry } from "../types"

// Seeded mock history for the MVP cabinet.
// TODO(backend): replace with a real customer order-history endpoint.
// OrderViewSet currently requires staff permission, so customers cannot
// list their own past orders yet.
export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "h-1",
    restaurantName: "TableMate Bistro",
    date: "2026-05-18T19:30:00Z",
    total: 48.5,
    currency: "USD",
    itemCount: 4,
  },
  {
    id: "h-2",
    restaurantName: "TableMate Bistro",
    date: "2026-04-29T13:05:00Z",
    total: 22.0,
    currency: "USD",
    itemCount: 2,
  },
  {
    id: "h-3",
    restaurantName: "TableMate Bistro",
    date: "2026-03-11T20:15:00Z",
    total: 76.9,
    currency: "USD",
    itemCount: 6,
  },
]
