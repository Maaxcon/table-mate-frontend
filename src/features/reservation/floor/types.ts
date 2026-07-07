import type { Table } from "@/types/api/types.gen"

export type Tone = "free" | "reserved" | "occupied"

// A table paired with its slot-aware visual state (used by the mobile card list).
export interface TableView {
  table: Table
  tone: Tone
  label: string
  bookable: boolean
  perfect: boolean
}

// A resolved table view for one spatial-map entity — the live table (if
// matched) joined with its slot-aware status. Geometry (position/rotation)
// comes separately from FloorPlanView's renderEntity callback, not here.
export interface Tile {
  key: string
  table: Table | undefined
  publicNumber: string
  capacity: number
  shape: "square" | "round"
  tone: Tone
  label: string
  bookable: boolean
  perfect: boolean
}
