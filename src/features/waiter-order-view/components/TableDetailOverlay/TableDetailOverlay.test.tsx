import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { TableDetailOverlay } from "./TableDetailOverlay"
import type { FloorTable, OverlayDetail, OverlayOrderItem, ReservationItem } from "../../types"
import i18n from "@/i18n/config"

vi.mock("../../api/orderApi", () => ({
  fetchVoidReasons: vi.fn().mockResolvedValue([
    { code: "mispick", label: "Mispick" },
    { code: "guest_changed_mind", label: "Guest changed mind" },
  ]),
}))

function makeTable(overrides: Partial<FloorTable> = {}): FloorTable {
  return {
    public_id: "t-1",
    public_number: "5",
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
    payable: "29.99",
    is_paid: false,
    status: "pending",
    is_wasted: false,
    void_reason: null,
    comment: null,
    guest_display_name: null,
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

    const serviceLabel = i18n.t("admin.waiter.overlay.totals.service")
    expect(screen.getByText(serviceLabel)).toBeInTheDocument()
    expect(screen.getByText(/3\.00/)).toBeInTheDocument()
    // subtotal 59.98 + tax 6.00 + service 3.00 = total 68.98
    expect(screen.getByText(/59\.98/)).toBeInTheDocument()
    expect(screen.getByText(/6\.00/)).toBeInTheDocument()
    expect(screen.getByText(/68\.98/)).toBeInTheDocument()
  })

  it("hides the SERVICE row when there is no service charge", () => {
    renderOverlay(makeDetail({ service_charge: "0.00", total_amount: "65.98" }))

    const serviceLabel = i18n.t("admin.waiter.overlay.totals.service")
    expect(screen.queryByText(serviceLabel)).not.toBeInTheDocument()
  })

  it("hides the SERVICE row when service_charge is omitted", () => {
    renderOverlay(makeDetail({ service_charge: undefined, total_amount: "65.98" }))

    const serviceLabel = i18n.t("admin.waiter.overlay.totals.service")
    expect(screen.queryByText(serviceLabel)).not.toBeInTheDocument()
  })

  it("renders the bill with the session currency symbol, not a hardcoded euro", () => {
    renderOverlay(makeDetail({ currency: "UAH" }))

    // UAH → ₴; the old hardcoded euro must be gone.
    expect(screen.getByText(/₴68\.98/)).toBeInTheDocument()
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })

  it("shows overdue banner actions for an active reservation past end time", () => {
    const overdueReservation: ReservationItem = {
      public_id: "r-1",
      start_at: "2026-06-19T10:00:00Z",
      end_at: "2026-06-19T11:30:00Z",
      session_ends_at: null,
      guest_count: 2,
      status: "active",
      notes: null,
      table: "5",
      name: "Guest",
    }
    const onModifyReservation = vi.fn()
    const onCloseCheck = vi.fn()

    render(
      <TableDetailOverlay
        table={makeTable()}
        detail={makeDetail()}
        tableReservations={[overdueReservation]}
        visualStatus="occupied"
        loading={false}
        currentTime={new Date("2026-06-19T12:00:00Z")}
        onModifyReservation={onModifyReservation}
        onCloseCheck={onCloseCheck}
        onClose={vi.fn()}
      />,
    )

    const overdueText = i18n.t("admin.waiter.overlay.overdue.title", { minutes: 30 })
    expect(screen.getByText(overdueText)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("admin.waiter.overlay.overdue.prolong") }),
    )
    expect(onModifyReservation).toHaveBeenCalledWith(overdueReservation)
    expect(
      screen.getAllByRole("button", { name: i18n.t("admin.waiter.overlay.overdue.close") }).length,
    ).toBeGreaterThan(0)
  })

  it("requires a reason before bulk voiding and excludes served items", async () => {
    const onMarkAllVoided = vi.fn()
    render(
      <TableDetailOverlay
        table={makeTable()}
        detail={makeDetail({
          items: [
            makeOrderItem({ status: "pending" }),
            makeOrderItem({ public_id: "oi-2", status: "served" }),
          ],
        })}
        tableReservations={[]}
        visualStatus="occupied"
        loading={false}
        currentTime={new Date("2026-06-19T12:00:00Z")}
        onMarkAllVoided={onMarkAllVoided}
        onClose={vi.fn()}
      />,
    )

    const bulkVoid = await screen.findByRole("button", {
      name: `${i18n.t("admin.waiter.overlay.actions.markAllVoided")} (1)`,
    })
    fireEvent.click(bulkVoid)

    const confirm = screen.getByRole("button", {
      name: `${i18n.t("admin.waiter.overlay.actions.confirmBulkVoid")} (1)`,
    })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(i18n.t("admin.waiter.overlay.actions.bulkVoidReason")), {
      target: { value: "guest_changed_mind" },
    })
    fireEvent.click(confirm)

    expect(onMarkAllVoided).toHaveBeenCalledWith("guest_changed_mind")
  })
})
