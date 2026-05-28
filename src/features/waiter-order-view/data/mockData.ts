import type {
  TableStatus,
  TableShape,
  OrderItemStatusEnum,
  ReservationStatus,
} from "@/types/api/types.gen"

export interface FloorTable {
  public_id: string
  table_number: string
  capacity: number
  shape: TableShape
  status: TableStatus
  position_x: number | null
  position_y: number | null
  active: boolean

  guest_name?: string
  guest_count?: number
  since?: string

  reservation_name?: string
  party_size?: number
  arriving?: string
}

export interface ReservationItem {
  public_id: string
  start_at: string
  table: string
  guest_count: number
  status: ReservationStatus
  notes?: string | null

  name: string
  vip: boolean
}

export interface OverlayOrderItem {
  public_id: string
  guest_slot: number
  quantity: number
  name: string
  unit_price: string
  status: OrderItemStatusEnum
  is_wasted: boolean
  void_reason?: number | null
}

export interface OverlayDetail {
  public_id: string
  table_number: string
  guest_name: string
  guest_count: number
  duration: string
  currency: string
  items: OverlayOrderItem[]
  subtotal: string
  tax_total: string
  total_amount: string
  discount_total?: string
  service_charge?: string
}

export const FLOOR_TABLES: FloorTable[] = [
  {
    public_id: "t1",
    table_number: "01",
    capacity: 2,
    shape: "square",
    status: "occupied",
    position_x: 60,
    position_y: 80,
    active: true,
    guest_name: "Miller",
    guest_count: 2,
    since: "18:30",
  },
  {
    public_id: "t2",
    table_number: "02",
    capacity: 4,
    shape: "square",
    status: "occupied",
    position_x: 280,
    position_y: 80,
    active: true,
    guest_name: "Chen",
    guest_count: 3,
    since: "19:00",
  },
  {
    public_id: "t3",
    table_number: "03",
    capacity: 4,
    shape: "square",
    status: "free",
    position_x: 60,
    position_y: 260,
    active: true,
    reservation_name: "Sofia Rossi",
    party_size: 3,
    arriving: "21:15",
  },
  {
    public_id: "t4",
    table_number: "04",
    capacity: 6,
    shape: "round",
    status: "free",
    position_x: 280,
    position_y: 260,
    active: true,
    reservation_name: "Smith",
    party_size: 2,
    arriving: "20:15",
  },
  {
    public_id: "t5",
    table_number: "05",
    capacity: 2,
    shape: "square",
    status: "free",
    position_x: 60,
    position_y: 420,
    active: true,
  },
  {
    public_id: "t6",
    table_number: "06",
    capacity: 4,
    shape: "square",
    status: "occupied",
    position_x: 280,
    position_y: 420,
    active: true,
    guest_name: "Nakamura",
    guest_count: 4,
    since: "18:45",
  },
  {
    public_id: "t7",
    table_number: "07",
    capacity: 2,
    shape: "square",
    status: "free",
    position_x: 500,
    position_y: 80,
    active: true,
    reservation_name: "Watson",
    party_size: 2,
    arriving: "20:30",
  },
  {
    public_id: "t8",
    table_number: "08",
    capacity: 4,
    shape: "round",
    status: "free",
    position_x: 500,
    position_y: 260,
    active: true,
  },
  {
    public_id: "t9",
    table_number: "09",
    capacity: 6,
    shape: "square",
    status: "free",
    position_x: 500,
    position_y: 420,
    active: true,
    reservation_name: "Garcia",
    party_size: 5,
    arriving: "21:00",
  },
]

export const RESERVATIONS: ReservationItem[] = [
  {
    public_id: "r1",
    start_at: "2025-06-01T21:30:00",
    table: "T-01",
    guest_count: 2,
    status: "confirmed",
    name: "Olena Kovalenko",
    vip: false,
    notes: "Anniversary dinner",
  },
  {
    public_id: "r2",
    start_at: "2025-06-01T23:00:00",
    table: "T-01",
    guest_count: 2,
    status: "confirmed",
    name: "Maksym Bondar",
    vip: true,
    notes: "Birthday celebration",
  },
  {
    public_id: "r3",
    start_at: "2025-06-01T21:00:00",
    table: "T-02",
    guest_count: 4,
    status: "confirmed",
    name: "David Kim",
    vip: false,
    notes: null,
  },
  {
    public_id: "r4",
    start_at: "2025-06-01T22:30:00",
    table: "T-02",
    guest_count: 2,
    status: "confirmed",
    name: "Anna Shevchenko",
    vip: true,
    notes: "Window table requested",
  },
  {
    public_id: "r5",
    start_at: "2025-06-01T21:15:00",
    table: "T-03",
    guest_count: 3,
    status: "confirmed",
    name: "Sofia Rossi",
    vip: false,
    notes: null,
  },
  {
    public_id: "r6",
    start_at: "2025-06-01T23:00:00",
    table: "T-03",
    guest_count: 4,
    status: "confirmed",
    name: "Ivan Petrov",
    vip: false,
    notes: "Allergies: nuts",
  },
  {
    public_id: "r7",
    start_at: "2025-06-01T20:15:00",
    table: "T-04",
    guest_count: 2,
    status: "confirmed",
    name: "Smith",
    vip: false,
    notes: null,
  },
  {
    public_id: "r8",
    start_at: "2025-06-01T22:00:00",
    table: "T-04",
    guest_count: 6,
    status: "confirmed",
    name: "Tetiana Melnyk",
    vip: true,
    notes: "Business dinner",
  },
  {
    public_id: "r9",
    start_at: "2025-06-01T20:30:00",
    table: "T-06",
    guest_count: 2,
    status: "confirmed",
    name: "John Doe",
    vip: false,
    notes: null,
  },
  {
    public_id: "r10",
    start_at: "2025-06-01T22:00:00",
    table: "T-06",
    guest_count: 4,
    status: "confirmed",
    name: "Maria Gonzalez",
    vip: true,
    notes: "Dietary restrictions: vegetarian",
  },
  {
    public_id: "r11",
    start_at: "2025-06-01T20:30:00",
    table: "T-07",
    guest_count: 2,
    status: "confirmed",
    name: "Emma Watson",
    vip: false,
    notes: null,
  },
  {
    public_id: "r12",
    start_at: "2025-06-01T21:00:00",
    table: "T-09",
    guest_count: 5,
    status: "confirmed",
    name: "Carlos Garcia",
    vip: true,
    notes: "Gluten-free options needed",
  },
]

export const OVERLAY_DETAILS: Record<string, OverlayDetail> = {
  t1: {
    public_id: "ord-t1",
    table_number: "01",
    guest_name: "Miller",
    guest_count: 2,
    duration: "75m",
    currency: "EUR",
    subtotal: "49.00",
    tax_total: "4.90",
    total_amount: "53.90",
    items: [
      {
        public_id: "oi1",
        guest_slot: 1,
        quantity: 1,
        name: "Caesar Salad",
        unit_price: "12.50",
        status: "served",
        is_wasted: false,
      },
      {
        public_id: "oi2",
        guest_slot: 1,
        quantity: 1,
        name: "Classic Burger",
        unit_price: "18.00",
        status: "ready",
        is_wasted: false,
      },
      {
        public_id: "oi3",
        guest_slot: 1,
        quantity: 1,
        name: "Cola",
        unit_price: "4.50",
        status: "served",
        is_wasted: false,
      },
      {
        public_id: "oi4",
        guest_slot: 2,
        quantity: 1,
        name: "Buffalo Wings",
        unit_price: "14.00",
        status: "in_progress",
        is_wasted: false,
      },
      {
        public_id: "oi5",
        guest_slot: 2,
        quantity: 1,
        name: "Sparkling Water",
        unit_price: "4.00",
        status: "served",
        is_wasted: false,
      },
    ],
  },
  t2: {
    public_id: "ord-t2",
    table_number: "02",
    guest_name: "Chen",
    guest_count: 3,
    duration: "45m",
    currency: "EUR",
    subtotal: "84.50",
    tax_total: "8.45",
    total_amount: "92.95",
    items: [
      {
        public_id: "oi6",
        guest_slot: 1,
        quantity: 1,
        name: "Buffalo Wings",
        unit_price: "14.00",
        status: "ready",
        is_wasted: false,
      },
      {
        public_id: "oi7",
        guest_slot: 1,
        quantity: 1,
        name: "Ribeye Steak",
        unit_price: "34.00",
        status: "in_progress",
        is_wasted: false,
      },
      {
        public_id: "oi8",
        guest_slot: 2,
        quantity: 1,
        name: "Caesar Salad",
        unit_price: "12.50",
        status: "served",
        is_wasted: false,
      },
      {
        public_id: "oi9",
        guest_slot: 2,
        quantity: 1,
        name: "Spaghetti Carbonara",
        unit_price: "22.00",
        status: "pending",
        is_wasted: false,
      },
      {
        public_id: "oi10",
        guest_slot: 3,
        quantity: 1,
        name: "Grilled Salmon",
        unit_price: "26.00",
        status: "voided",
        is_wasted: true,
        void_reason: 4,
      },
      {
        public_id: "oi11",
        guest_slot: 3,
        quantity: 2,
        name: "Cola",
        unit_price: "4.50",
        status: "pending",
        is_wasted: false,
      },
    ],
  },
  t6: {
    public_id: "ord-t6",
    table_number: "06",
    guest_name: "Nakamura",
    guest_count: 4,
    duration: "60m",
    currency: "EUR",
    subtotal: "118.00",
    tax_total: "11.80",
    total_amount: "129.80",
    items: [
      {
        public_id: "oi12",
        guest_slot: 1,
        quantity: 2,
        name: "Truffle Risotto",
        unit_price: "24.00",
        status: "ready",
        is_wasted: false,
      },
      {
        public_id: "oi13",
        guest_slot: 2,
        quantity: 1,
        name: "Grilled Salmon",
        unit_price: "26.00",
        status: "in_progress",
        is_wasted: false,
      },
      {
        public_id: "oi14",
        guest_slot: 3,
        quantity: 1,
        name: "Caesar Salad",
        unit_price: "12.50",
        status: "served",
        is_wasted: false,
      },
      {
        public_id: "oi15",
        guest_slot: 4,
        quantity: 1,
        name: "Ribeye Steak",
        unit_price: "34.00",
        status: "pending",
        is_wasted: false,
      },
      {
        public_id: "oi16",
        guest_slot: 4,
        quantity: 3,
        name: "Cola",
        unit_price: "4.50",
        status: "pending",
        is_wasted: false,
      },
    ],
  },
}

export const VOID_REASON_LABELS: Record<number, string> = {
  1: "mispick",
  2: "guest_changed_mind",
  3: "quality_issue",
  4: "out_of_stock",
}

export function getTimeFromDatetime(datetime: string): string {
  const d = new Date(datetime)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}
