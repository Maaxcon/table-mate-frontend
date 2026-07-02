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

// A positioned table on the spatial floor map (real editor coords or auto grid).
export interface Tile {
  key: string
  table: Table | undefined
  publicNumber: string
  capacity: number
  x: number
  y: number
  w: number
  h: number
  rotation: number
  shape: "square" | "round"
  tone: Tone
  label: string
  bookable: boolean
  perfect: boolean
}
