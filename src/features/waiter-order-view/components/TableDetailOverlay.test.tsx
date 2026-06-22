import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TableDetailOverlay } from "./TableDetailOverlay"
import type { FloorTable, OverlayDetail, OverlayOrderItem } from "../data/waiterTypes"

function makeTable(overrides: Partial<FloorTable> = {}): FloorTable {
  return {
    public_id: "t-1",
    table_number: "5",
    capacity: 4,
    shape: "square",
    is_occupied: true,
    position_x: 0,
    position_y: 0,
    active: true,
    zone: null,
    ...overrides,
  }
}

function makeOrderItem(overrides: Partial<OverlayOrderItem> = {}): OverlayOrderItem {
  return {
    public_id: "oi-1",
    guest_slot: 1,
    quantity: 2,
    name: "Burger",
    unit_price: "29.99",
    status: "pending",
    is_wasted: false,
    void_reason: null,
    comment: null,
    ...overrides,
  }
}

function makeDetail(overrides: Partial<OverlayDetail> = {}): OverlayDetail {
  return {
    public_id: "s-1",
    table_number: "5",
    guest_name: "Max",
    guest_count: 2,
    duration: "10m",
    currency: "UAH",
    items: [makeOrderItem()],
    subtotal: "59.98",
    tax_total: "6.00",
    total_amount: "68.98",
    service_charge: "3.00",
    discount_total: "0.00",
    ...overrides,
  }
}

function renderOverlay(detail: OverlayDetail) {
  return render(
    <TableDetailOverlay
      table={makeTable()}
      detail={detail}
      tableReservations={[]}
      visualStatus="occupied"
      loading={false}
      currentTime={new Date("2026-06-19T12:00:00Z")}
      onClose={vi.fn()}
    />,
  )
}

describe("TableDetailOverlay bill", () => {
  it("shows a SERVICE row so the bill reconciles when a service charge exists", () => {
    renderOverlay(makeDetail({ service_charge: "3.00" }))

    expect(screen.getByText("SERVICE")).toBeInTheDocument()
    expect(screen.getByText(/3\.00/)).toBeInTheDocument()
    // subtotal 59.98 + tax 6.00 + service 3.00 = total 68.98
    expect(screen.getByText(/59\.98/)).toBeInTheDocument()
    expect(screen.getByText(/6\.00/)).toBeInTheDocument()
    expect(screen.getByText(/68\.98/)).toBeInTheDocument()
  })

  it("hides the SERVICE row when there is no service charge", () => {
    renderOverlay(makeDetail({ service_charge: "0.00", total_amount: "65.98" }))

    expect(screen.queryByText("SERVICE")).not.toBeInTheDocument()
  })

  it("hides the SERVICE row when service_charge is omitted", () => {
    renderOverlay(makeDetail({ service_charge: undefined, total_amount: "65.98" }))

    expect(screen.queryByText("SERVICE")).not.toBeInTheDocument()
  })

  it("renders the bill with the session currency symbol, not a hardcoded euro", () => {
    renderOverlay(makeDetail({ currency: "UAH" }))

    // UAH → ₴; the old hardcoded euro must be gone.
    expect(screen.getByText(/₴68\.98/)).toBeInTheDocument()
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })
})
