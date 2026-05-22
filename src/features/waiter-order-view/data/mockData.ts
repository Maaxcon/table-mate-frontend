export interface FloorTable {
  id: string
  number: string
  capacity: number
  shape: "square" | "circle"
  status: "free" | "occupied" | "reserved"
  position: { x: number; y: number }

  guest_name?: string
  guest_count?: number
  since?: string

  reservation_name?: string
  party_size?: number
  arriving?: string
}

export interface ReservationItem {
  id: string
  time: string
  table: string
  name: string
  guests: number
  vip: boolean
}

export interface OverlayOrderItem {
  id: string
  guest_slot: number
  quantity: number
  name: string
  price: string
  status: "pending" | "in_progress" | "ready" | "served" | "voided"
  void_reason?: string | null
}

export interface OverlayDetail {
  table_number: string
  guest_name: string
  guest_count: number
  duration: string
  items: OverlayOrderItem[]
  subtotal: string
  taxes: string
  total: string
}

export const FLOOR_TABLES: FloorTable[] = [
  {
    id: "t1",
    number: "01",
    capacity: 2,
    shape: "square",
    status: "occupied",
    position: { x: 60, y: 80 },
    guest_name: "Miller",
    guest_count: 2,
    since: "18:30",
  },
  {
    id: "t2",
    number: "02",
    capacity: 4,
    shape: "square",
    status: "occupied",
    position: { x: 280, y: 80 },
    guest_name: "Chen",
    guest_count: 3,
    since: "19:00",
  },
  {
    id: "t3",
    number: "03",
    capacity: 4,
    shape: "square",
    status: "free",
    position: { x: 60, y: 260 },
  },
  {
    id: "t4",
    number: "04",
    capacity: 6,
    shape: "circle",
    status: "reserved",
    position: { x: 280, y: 260 },
    reservation_name: "Smith",
    party_size: 2,
    arriving: "20:15",
  },
  {
    id: "t5",
    number: "05",
    capacity: 2,
    shape: "square",
    status: "free",
    position: { x: 60, y: 420 },
  },
  {
    id: "t6",
    number: "06",
    capacity: 4,
    shape: "square",
    status: "occupied",
    position: { x: 280, y: 420 },
    guest_name: "Nakamura",
    guest_count: 4,
    since: "18:45",
  },
  {
    id: "t7",
    number: "07",
    capacity: 2,
    shape: "square",
    status: "reserved",
    position: { x: 500, y: 80 },
    reservation_name: "Watson",
    party_size: 2,
    arriving: "20:30",
  },
  {
    id: "t8",
    number: "08",
    capacity: 4,
    shape: "circle",
    status: "free",
    position: { x: 500, y: 260 },
  },
  {
    id: "t9",
    number: "09",
    capacity: 6,
    shape: "square",
    status: "reserved",
    position: { x: 500, y: 420 },
    reservation_name: "Garcia",
    party_size: 5,
    arriving: "21:00",
  },
]

export const RESERVATIONS: ReservationItem[] = [
  { id: "r1", time: "20:00", table: "T-04", name: "Alexander Volkov", guests: 4, vip: true },
  { id: "r2", time: "20:30", table: "T-07", name: "Emma Watson", guests: 2, vip: false },
  { id: "r3", time: "21:00", table: "T-09", name: "Carlos Garcia", guests: 5, vip: true },
  { id: "r4", time: "21:15", table: "T-03", name: "Sofia Rossi", guests: 3, vip: false },
]

export const OVERLAY_DETAILS: Record<string, OverlayDetail> = {
  t1: {
    table_number: "01",
    guest_name: "Miller",
    guest_count: 2,
    duration: "75m",
    subtotal: "49.00",
    taxes: "4.90",
    total: "53.90",
    items: [
      {
        id: "oi1",
        guest_slot: 1,
        quantity: 1,
        name: "Caesar Salad",
        price: "12.50",
        status: "served",
      },
      {
        id: "oi2",
        guest_slot: 1,
        quantity: 1,
        name: "Classic Burger",
        price: "18.00",
        status: "ready",
      },
      { id: "oi3", guest_slot: 1, quantity: 1, name: "Cola", price: "4.50", status: "served" },
      {
        id: "oi4",
        guest_slot: 2,
        quantity: 1,
        name: "Buffalo Wings",
        price: "14.00",
        status: "in_progress",
      },
      {
        id: "oi5",
        guest_slot: 2,
        quantity: 1,
        name: "Sparkling Water",
        price: "4.00",
        status: "served",
      },
    ],
  },
  t2: {
    table_number: "02",
    guest_name: "Chen",
    guest_count: 3,
    duration: "45m",
    subtotal: "84.50",
    taxes: "8.45",
    total: "92.95",
    items: [
      {
        id: "oi6",
        guest_slot: 1,
        quantity: 1,
        name: "Buffalo Wings",
        price: "14.00",
        status: "ready",
      },
      {
        id: "oi7",
        guest_slot: 1,
        quantity: 1,
        name: "Ribeye Steak",
        price: "34.00",
        status: "in_progress",
      },
      {
        id: "oi8",
        guest_slot: 2,
        quantity: 1,
        name: "Caesar Salad",
        price: "12.50",
        status: "served",
      },
      {
        id: "oi9",
        guest_slot: 2,
        quantity: 1,
        name: "Spaghetti Carbonara",
        price: "22.00",
        status: "pending",
      },
      {
        id: "oi10",
        guest_slot: 3,
        quantity: 1,
        name: "Grilled Salmon",
        price: "26.00",
        status: "voided",
        void_reason: "out_of_stock",
      },
      { id: "oi11", guest_slot: 3, quantity: 2, name: "Cola", price: "4.50", status: "pending" },
    ],
  },
  t6: {
    table_number: "06",
    guest_name: "Nakamura",
    guest_count: 4,
    duration: "60m",
    subtotal: "118.00",
    taxes: "11.80",
    total: "129.80",
    items: [
      {
        id: "oi12",
        guest_slot: 1,
        quantity: 2,
        name: "Truffle Risotto",
        price: "24.00",
        status: "ready",
      },
      {
        id: "oi13",
        guest_slot: 2,
        quantity: 1,
        name: "Grilled Salmon",
        price: "26.00",
        status: "in_progress",
      },
      {
        id: "oi14",
        guest_slot: 3,
        quantity: 1,
        name: "Caesar Salad",
        price: "12.50",
        status: "served",
      },
      {
        id: "oi15",
        guest_slot: 4,
        quantity: 1,
        name: "Ribeye Steak",
        price: "34.00",
        status: "pending",
      },
      { id: "oi16", guest_slot: 4, quantity: 3, name: "Cola", price: "4.50", status: "pending" },
    ],
  },
}
