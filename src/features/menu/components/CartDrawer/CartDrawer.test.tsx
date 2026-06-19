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
    isPaid: false,
    item: makeMenuItem(),
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
    // Server total (65.98, tax-inclusive) differs from the client subtotal (59.98).
    const onCheckout = vi.fn<() => Promise<CheckoutResult>>().mockResolvedValue({
      orderId: "ord-1",
      total: "65.98",
    })
    renderDrawer({ onCheckout })

    await openConfirm(user)
    await user.click(screen.getByRole("button", { name: S.confirmYes }))

    expect(await screen.findByText(S.confirmedTitle)).toBeInTheDocument()
    const receiptTotal = screen.getByText(S.total).closest("div")!
    expect(within(receiptTotal).getByText(new RegExp(formatAmount(65.98)))).toBeInTheDocument()
    expect(
      within(receiptTotal).queryByText(new RegExp(formatAmount(59.98))),
    ).not.toBeInTheDocument()
  })

  it("falls back to the client subtotal when the server omits the total", async () => {
    const user = userEvent.setup()
    const onCheckout = vi
      .fn<() => Promise<CheckoutResult>>()
      .mockResolvedValue({ orderId: "ord-1", total: "" })
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
    resolve({ orderId: "ord-1", total: "65.98" })
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
      .mockResolvedValueOnce({ orderId: "ord-2", total: "65.98" })
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
})
