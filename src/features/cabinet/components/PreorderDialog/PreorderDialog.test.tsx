import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { PreorderDialog } from "./PreorderDialog"
import type { Preorder, Reservation } from "@/features/cabinet/types"
import i18n from "@/i18n/config"

vi.mock("@/features/cabinet/api", () => ({
  fetchPreorder: vi.fn(),
  cancelPreorder: vi.fn(),
  cancelPreorderItem: vi.fn(),
}))

import { cancelPreorder, cancelPreorderItem, fetchPreorder } from "@/features/cabinet/api"

const booking = {
  public_id: "res-1",
  restaurant: "rest-1",
  status: "pending",
  start_at: "2026-08-04T18:00:00Z",
  table_info: { public_number: "T5" },
} as Reservation

function MenuProbe() {
  const location = useLocation()
  return <div data-testid="menu-route">{`${location.pathname}${location.search}`}</div>
}

function renderDialog(props: Partial<React.ComponentProps<typeof PreorderDialog>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/cabinet"]}>
      <Routes>
        <Route
          path="/cabinet"
          element={
            <PreorderDialog booking={booking} onClose={vi.fn()} onCancelled={vi.fn()} {...props} />
          }
        />
        <Route path="/menu/:restaurantId" element={<MenuProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

// isCooking defaults to !canCancel, which is what the existing cases mean:
// the only reason they can't cancel is that the kitchen started.
const preorder = (canCancel: boolean, isCooking = !canCancel): Preorder => ({
  orderId: "ord-1",
  currency: "UAH",
  subtotal: 100,
  tax: 10,
  serviceCharge: 5,
  total: 115,
  isCooking,
  canCancel,
  canAddMore: canCancel,
  items: [
    { id: "item-1", name: "Steak", quantity: 1, unitPrice: 100, totalPrice: 100 },
    { id: "item-2", name: "Salad", quantity: 1, unitPrice: 40, totalPrice: 40 },
  ],
})

describe("PreorderDialog", () => {
  beforeEach(() => {
    vi.mocked(fetchPreorder).mockReset()
    vi.mocked(cancelPreorder).mockReset()
    vi.mocked(cancelPreorderItem).mockReset()
  })

  it("shows the server's reason when the kitchen already started a round", async () => {
    // The backend's own `detail` is English-only, so the dialog translates off
    // the error code instead and must never render the raw text.
    const serverMessage = "The kitchen has already started this pre-order — it can't be cancelled."
    const translated = i18n.t("errors.server.preorder_not_allowed")
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))
    vi.mocked(cancelPreorder).mockRejectedValue(
      Object.assign(new Error(serverMessage), { code: "preorder_not_allowed" }),
    )

    renderDialog()

    const cancel = await screen.findByRole("button", {
      name: i18n.t("cabinet.bookings.preorderCancel"),
    })
    await userEvent.click(cancel)

    expect(await screen.findByText(translated)).toBeInTheDocument()
    expect(screen.queryByText(serverMessage)).not.toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t("cabinet.bookings.preorderCancelError")),
    ).not.toBeInTheDocument()
  })

  it("locks the button after a refusal instead of inviting another try", async () => {
    vi.mocked(fetchPreorder)
      .mockResolvedValueOnce(preorder(true))
      .mockResolvedValueOnce(preorder(false))
    vi.mocked(cancelPreorder).mockRejectedValue(new Error("kitchen started"))

    renderDialog()

    await userEvent.click(
      await screen.findByRole("button", { name: i18n.t("cabinet.bookings.preorderCancel") }),
    )

    await waitFor(() => {
      expect(screen.getByText(i18n.t("cabinet.bookings.preorderLocked"))).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("button", { name: i18n.t("cabinet.bookings.preorderCancel") }),
    ).not.toBeInTheDocument()
  })

  it("closes and tells the list when the cancel succeeds", async () => {
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))
    vi.mocked(cancelPreorder).mockResolvedValue(undefined)
    const onClose = vi.fn()
    const onCancelled = vi.fn()

    renderDialog({ onClose, onCancelled })

    await userEvent.click(
      await screen.findByRole("button", { name: i18n.t("cabinet.bookings.preorderCancel") }),
    )

    await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("opens the menu for this booking when the guest adds more items", async () => {
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))

    renderDialog()

    await userEvent.click(
      await screen.findByRole("button", { name: i18n.t("cabinet.bookings.preorderAddMore") }),
    )

    expect(await screen.findByTestId("menu-route")).toHaveTextContent(
      "/menu/rest-1?reservation=res-1",
    )
  })

  it("shows the shortened check after one dish is removed", async () => {
    const rest = preorder(true)
    rest.items = rest.items.filter((i) => i.id !== "item-1")
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))
    vi.mocked(cancelPreorderItem).mockResolvedValue(rest)

    renderDialog()

    await userEvent.click(
      await screen.findByRole("button", {
        name: i18n.t("cabinet.bookings.preorderItemRemove", { name: "Steak" }),
      }),
    )

    await waitFor(() => expect(screen.queryByText("Steak")).not.toBeInTheDocument())
    expect(screen.getByText("Salad")).toBeInTheDocument()
    expect(cancelPreorderItem).toHaveBeenCalledWith("res-1", "item-1")
  })

  it("closes when the removed dish was the last one", async () => {
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))
    // 204: the round went with the dish.
    vi.mocked(cancelPreorderItem).mockResolvedValue(null)
    const onClose = vi.fn()
    const onCancelled = vi.fn()

    renderDialog({ onClose, onCancelled })

    await userEvent.click(
      await screen.findByRole("button", {
        name: i18n.t("cabinet.bookings.preorderItemRemove", { name: "Steak" }),
      }),
    )

    await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("offers no remove buttons once the kitchen has the round", async () => {
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(false))

    renderDialog()

    await screen.findByText(i18n.t("cabinet.bookings.preorderLocked"))
    expect(
      screen.queryByRole("button", {
        name: i18n.t("cabinet.bookings.preorderItemRemove", { name: "Steak" }),
      }),
    ).not.toBeInTheDocument()
  })

  it("hides adding more once the kitchen window has closed", async () => {
    const closed = preorder(true)
    closed.canAddMore = false
    vi.mocked(fetchPreorder).mockResolvedValue(closed)

    renderDialog()

    await screen.findByRole("button", { name: i18n.t("cabinet.bookings.preorderCancel") })
    expect(
      screen.queryByRole("button", { name: i18n.t("cabinet.bookings.preorderAddMore") }),
    ).not.toBeInTheDocument()
  })
})

describe("PreorderDialog for a participant who isn't the booker", () => {
  beforeEach(() => {
    vi.mocked(fetchPreorder).mockReset()
    vi.mocked(cancelPreorder).mockReset()
  })

  it("says the booker has to cancel, rather than blaming the kitchen", async () => {
    // Paid, nothing cooking yet, but this guest didn't make the booking.
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(false, false))

    renderDialog()

    // Assert through i18n rather than literal copy — the test env renders uk.
    const ownerOnly = i18n.t("cabinet.bookings.preorderOwnerOnly")
    const kitchenStarted = i18n.t("cabinet.bookings.preorderLocked")
    await waitFor(() => expect(screen.getByText(ownerOnly)).toBeTruthy())
    expect(screen.queryByText(kitchenStarted)).toBeNull()
    expect(screen.queryByText(i18n.t("cabinet.bookings.preorderCancel"))).toBeNull()
  })
})
