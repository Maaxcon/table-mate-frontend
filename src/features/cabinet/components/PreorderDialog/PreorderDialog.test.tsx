import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PreorderDialog } from "./PreorderDialog"
import type { Preorder, Reservation } from "@/features/cabinet/types"
import i18n from "@/i18n/config"

vi.mock("@/features/cabinet/api", () => ({
  fetchPreorder: vi.fn(),
  cancelPreorder: vi.fn(),
}))

import { cancelPreorder, fetchPreorder } from "@/features/cabinet/api"

const booking = {
  public_id: "res-1",
  start_at: "2026-08-04T18:00:00Z",
  table_info: { public_number: "T5" },
} as Reservation

const preorder = (canCancel: boolean): Preorder => ({
  orderId: "ord-1",
  currency: "UAH",
  subtotal: 100,
  tax: 10,
  serviceCharge: 5,
  total: 115,
  canCancel,
  items: [{ name: "Steak", quantity: 1, unitPrice: 100, totalPrice: 100 }],
})

describe("PreorderDialog", () => {
  beforeEach(() => {
    vi.mocked(fetchPreorder).mockReset()
    vi.mocked(cancelPreorder).mockReset()
  })

  it("shows the server's reason when the kitchen already started a round", async () => {
    const serverMessage = "The kitchen has already started this pre-order — it can't be cancelled."
    vi.mocked(fetchPreorder).mockResolvedValue(preorder(true))
    vi.mocked(cancelPreorder).mockRejectedValue(new Error(serverMessage))

    render(<PreorderDialog booking={booking} onClose={vi.fn()} onCancelled={vi.fn()} />)

    const cancel = await screen.findByRole("button", {
      name: i18n.t("cabinet.bookings.preorderCancel"),
    })
    await userEvent.click(cancel)

    expect(await screen.findByText(serverMessage)).toBeInTheDocument()
    expect(
      screen.queryByText(i18n.t("cabinet.bookings.preorderCancelError")),
    ).not.toBeInTheDocument()
  })

  it("locks the button after a refusal instead of inviting another try", async () => {
    vi.mocked(fetchPreorder)
      .mockResolvedValueOnce(preorder(true))
      .mockResolvedValueOnce(preorder(false))
    vi.mocked(cancelPreorder).mockRejectedValue(new Error("kitchen started"))

    render(<PreorderDialog booking={booking} onClose={vi.fn()} onCancelled={vi.fn()} />)

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

    render(<PreorderDialog booking={booking} onClose={onClose} onCancelled={onCancelled} />)

    await userEvent.click(
      await screen.findByRole("button", { name: i18n.t("cabinet.bookings.preorderCancel") }),
    )

    await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce())
    expect(onClose).toHaveBeenCalledOnce()
  })
})
