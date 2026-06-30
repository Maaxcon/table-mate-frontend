import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CartDrawer } from "./CartDrawer"
import { CartChangedError, type CheckoutResult } from "@/features/menu/api"
import type { CartItemWithDetails } from "@/features/menu/hooks/useCart"
import { formatAmount } from "@/features/menu/utils"
import { menuStrings } from "@/features/menu/strings"
import type { MenuItem } from "@/features/menu/types"

const S = menuStrings.cart

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    public_id: "mi-1",
    restaurant: "r-1",
    menu: "m-1",
    category: null,
    name: "Burger",
    ingredients: [],
    allergens: [],
    likes_count: 0,
    is_liked: false,
    price: "29.99",
    is_available: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeItem(overrides: Partial<CartItemWithDetails> = {}): CartItemWithDetails {
  return {
    id: "ci-1",
    menuItemId: "mi-1",
    quantity: 2,
    comment: null,
    guestSlot: null,
    isMine: true,
    addedBy: null,
    displayName: null,
    isPaid: false,
    item: makeMenuItem(),
    ...overrides,
  }
}

function makeResult(overrides: Partial<CheckoutResult> = {}): CheckoutResult {
  return {
    orderId: "ord-1",
    subtotal: "59.98",
    tax: "6.00",
    serviceCharge: "3.00",
    total: "68.98",
    ...overrides,
  }
}

type Overrides = Partial<React.ComponentProps<typeof CartDrawer>>

function renderDrawer(overrides: Overrides = {}) {
  const props: React.ComponentProps<typeof CartDrawer> = {
    items: [makeItem()],
    totalPrice: 59.98,
    currencySymbol: "₴",
    isConnected: true,
    error: null,
    errorItemId: null,
    displayName: "Max",
    onChangeQuantity: vi.fn(),
    onRemoveItem: vi.fn(),
    onClose: vi.fn(),
    onClearError: vi.fn(),
    onCheckout: vi.fn<() => Promise<CheckoutResult>>(),
    billItems: [],
    billLoading: false,
    onLoadBill: vi.fn(),
    onPayBill: vi.fn<(ids: string[]) => Promise<void>>().mockResolvedValue(undefined),
    onCartChanged: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<CartDrawer {...props} />) }
}

// Walk cart → confirming by clicking the footer "checkout" button.
async function openConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: S.checkout }))
}

describe("CartDrawer checkout state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the empty state and no checkout button when the cart is empty", () => {
    renderDrawer({ items: [] })
    expect(screen.getByText(S.emptyTitle)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: S.checkout })).not.toBeInTheDocument()
  })

  it("shows the authoritative server total on the receipt, not the client subtotal", async () => {
    const user = userEvent.setup()
    // Server total (68.98, tax+service inclusive) differs from the client subtotal (59.98).
    const onCheckout = vi.fn<() => Promise<CheckoutResult>>().mockResolvedValue(makeResult())
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    expect(await screen.findByText(S.confirmedTitle)).toBeInTheDocument()
    const receiptTotal = screen.getByText(S.total).closest("div")!
    expect(within(receiptTotal).getByText(new RegExp(formatAmount(68.98)))).toBeInTheDocument()
  })

  it("renders the tax/service breakdown so the receipt reconciles", async () => {
    const user = userEvent.setup()
    const onCheckout = vi.fn<() => Promise<CheckoutResult>>().mockResolvedValue(makeResult())
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    await screen.findByText(S.confirmedTitle)
    // subtotal 59.98 + tax 6.00 + service 3.00 = total 68.98
    expect(screen.getByText(S.subtotal)).toBeInTheDocument()
    expect(screen.getByText(S.tax)).toBeInTheDocument()
    expect(screen.getByText(S.serviceCharge)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formatAmount(3.0)))).toBeInTheDocument()
  })

  it("hides the tax/service rows when there is no tax or service charge", async () => {
    const user = userEvent.setup()
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockResolvedValue(makeResult({ tax: "0.00", serviceCharge: "0.00", total: "59.98" }))
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    await screen.findByText(S.confirmedTitle)
    expect(screen.queryByText(S.tax)).not.toBeInTheDocument()
    expect(screen.queryByText(S.serviceCharge)).not.toBeInTheDocument()
  })

  it("falls back to the client subtotal when the server omits the total", async () => {
    const user = userEvent.setup()
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockResolvedValue(makeResult({ subtotal: "", tax: "", serviceCharge: "", total: "" }))
    renderDrawer({ onCheckout, items: [makeItem({ quantity: 2 })] })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    await screen.findByText(S.confirmedTitle)
    const receiptTotal = screen.getByText(S.total).closest("div")!
    expect(within(receiptTotal).getByText(new RegExp(formatAmount(59.98)))).toBeInTheDocument()
  })

  it("guards against double-submit: a second confirm tap does not re-call onCheckout", async () => {
    const user = userEvent.setup()
    let resolve!: (r: CheckoutResult) => void
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockImplementation(() => new Promise<CheckoutResult>((res) => (resolve = res)))
    renderDrawer({ onCheckout })

    await openConfirm(user)
    const confirmBtn = screen.getByRole("button", { name: S.confirmYes })
    await user.click(confirmBtn)
    expect(screen.getByRole("button", { name: S.submitting })).toBeDisabled()
    // Button is now disabled (submitting) — a second click must be a no-op.
    await user.click(confirmBtn)

    expect(onCheckout).toHaveBeenCalledTimes(1)
    resolve(makeResult())
  })

  it("moves to the 'changed' step and reports removed items on CartChangedError", async () => {
    const user = userEvent.setup()
    const onCartChanged = vi.fn()
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockRejectedValue(new CartChangedError([{ id: "mi-9", name: "Soup" }]))
    renderDrawer({ onCheckout, onCartChanged })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    expect(await screen.findByText(S.changedTitle)).toBeInTheDocument()
    expect(screen.getByText("Soup")).toBeInTheDocument()
    expect(onCartChanged).toHaveBeenCalledTimes(1)
  })

  it("shows a checkout error and clears it when the confirm dialog is reopened", async () => {
    const user = userEvent.setup()
    const onCheckout = vi.fn<() => Promise<CheckoutResult>>().mockRejectedValue(new Error("boom"))
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))
    expect(await screen.findByText(S.checkoutError)).toBeInTheDocument()

    // Cancel back to cart, then reopen confirm — the stale error must be gone.
    await user.click(screen.getByRole("button", { name: S.confirmNo }))
    await openConfirm(user)
    expect(screen.queryByText(S.checkoutError)).not.toBeInTheDocument()
  })

  it("calls onRetry from the checkout error toast when available", () => {
    const onRetry = vi.fn()
    renderDrawer({ error: S.checkoutError, onRetry })

    screen.getByRole("button", { name: S.retry }).click()

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("closes the drawer when Escape is pressed", () => {
    const onClose = vi.fn()
    renderDrawer({ onClose })

    fireEvent.keyDown(document, { key: "Escape" })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("lets the user retry checkout from the changed step when items remain", async () => {
    const user = userEvent.setup()
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockRejectedValueOnce(new CartChangedError([{ id: "mi-9", name: "Soup" }]))
      .mockResolvedValueOnce(makeResult({ orderId: "ord-2" }))
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    expect(await screen.findByText(S.changedTitle)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: S.confirmRemaining }))

    expect(onCheckout).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(S.confirmedTitle)).toBeInTheDocument()
  })

  it("auto-clears a cart error after the timeout", async () => {
    vi.useFakeTimers()
    const onClearError = vi.fn()
    renderDrawer({ error: S.checkoutError, onClearError })

    await vi.advanceTimersByTimeAsync(5000)

    expect(onClearError).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("hides the connection status indicator when disabled", () => {
    renderDrawer({ showConnectionStatus: false })

    expect(screen.queryByTitle(S.connected)).not.toBeInTheDocument()
    expect(screen.queryByTitle(S.disconnected)).not.toBeInTheDocument()
  })

  it("opens the bill and loads ordered items when Pay is tapped", async () => {
    const user = userEvent.setup()
    const onLoadBill = vi.fn()
    renderDrawer({ onLoadBill })

    await user.click(screen.getByRole("tab", { name: S.billTitle }))

    expect(onLoadBill).toHaveBeenCalledTimes(1)
    expect(screen.getByText(S.billNoneToPay)).toBeInTheDocument()
  })

  it("pays the selected ordered items by their order-item ids", async () => {
    const user = userEvent.setup()
    const onPayBill = vi.fn<(ids: string[]) => Promise<void>>().mockResolvedValue(undefined)
    const billItems = [
      {
        id: "oi-1",
        name: "Pizza",
        guest_slot: 1,
        quantity: 1,
        payable: "34.50",
        is_paid: false,
      },
      {
        id: "oi-2",
        name: "Tea",
        guest_slot: 1,
        quantity: 2,
        payable: "23.00",
        is_paid: false,
      },
    ]
    renderDrawer({ billItems, onPayBill })

    await user.click(screen.getByRole("tab", { name: S.billTitle }))
    await user.click(screen.getByRole("button", { name: /Pizza/ }))
    await user.click(screen.getByRole("button", { name: new RegExp(`^${S.pay}`) }))

    expect(onPayBill).toHaveBeenCalledWith(["oi-1"])
  })

  it("surfaces an error and keeps the selection when payment fails", async () => {
    const user = userEvent.setup()
    const onPayBill = vi.fn<(ids: string[]) => Promise<void>>().mockRejectedValue(new Error("boom"))
    const billItems = [
      {
        id: "oi-1",
        name: "Pizza",
        guest_slot: 1,
        quantity: 1,
        payable: "34.50",
        is_paid: false,
      },
    ]
    renderDrawer({ billItems, onPayBill })

    await user.click(screen.getByRole("tab", { name: S.billTitle }))
    await user.click(screen.getByRole("button", { name: /Pizza/ }))
    await user.click(screen.getByRole("button", { name: new RegExp(`^${S.pay}`) }))

    // The failure is surfaced...
    expect(await screen.findByRole("alert")).toHaveTextContent(S.payError)
    // ...and the button is re-enabled, with the selection kept, so a retry
    // re-sends the same id (the BE pay is idempotent).
    const retry = screen.getByRole("button", { name: new RegExp(`^${S.pay}`) })
    expect(retry).toBeEnabled()
    await user.click(retry)
    expect(onPayBill).toHaveBeenCalledTimes(2)
    expect(onPayBill).toHaveBeenNthCalledWith(2, ["oi-1"])
  })

  it("exposes accessible bill controls (progressbar, select-all, tabpanel)", async () => {
    const user = userEvent.setup()
    const billItems = [
      {
        id: "oi-1",
        name: "Pizza",
        guest_slot: 1,
        quantity: 1,
        payable: "34.50",
        is_paid: false,
      },
      {
        id: "oi-2",
        name: "Tea",
        guest_slot: 1,
        quantity: 1,
        payable: "11.50",
        is_paid: true,
      },
    ]
    renderDrawer({ billItems })
    await user.click(screen.getByRole("tab", { name: S.billTitle }))

    // Progressbar has an accessible name and explicit bounds.
    const progress = screen.getByRole("progressbar", { name: S.billProgressLabel })
    expect(progress).toHaveAttribute("aria-valuemin", "0")
    expect(progress).toHaveAttribute("aria-valuemax", "100")

    // "Select all" is a toggle button, consistent with the per-item pay buttons.
    const selectAll = screen.getByRole("button", { name: S.billSelectAll })
    expect(selectAll).toHaveAttribute("aria-pressed", "false")
    await user.click(selectAll)
    expect(selectAll).toHaveAttribute("aria-pressed", "true")

    // The bill tab is wired to a tabpanel.
    expect(screen.getByRole("tab", { name: S.billTitle })).toHaveAttribute(
      "aria-controls",
      "cart-drawer-panel-bill",
    )
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "cart-drawer-tab-bill")
  })

  it("sums the bill on payable (tax + service), not goods-only total_price", async () => {
    const user = userEvent.setup()
    const billItems = [
      {
        id: "oi-1",
        name: "Pizza",
        guest_slot: 1,
        quantity: 1,
        payable: "34.50",
        is_paid: false,
      },
    ]
    renderDrawer({ billItems })
    await user.click(screen.getByRole("tab", { name: S.billTitle }))

    // The bill shows the full payable (34.50), reconciling with the receipt —
    // not the goods-only subtotal (30.00).
    expect(screen.getAllByText(new RegExp(formatAmount(34.5))).length).toBeGreaterThan(0)
    expect(screen.queryByText(new RegExp(formatAmount(30)))).not.toBeInTheDocument()
  })
})
