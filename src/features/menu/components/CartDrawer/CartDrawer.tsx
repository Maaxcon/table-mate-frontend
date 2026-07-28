import { useEffect, useState } from "react"
import {
  LuCheck,
  LuMinus,
  LuPlus,
  LuShoppingCart,
  LuTrash2,
  LuWifi,
  LuWifiOff,
  LuX,
} from "react-icons/lu"
import {
  CartChangedError,
  type BillItem,
  type CheckoutResult,
  type RemovedItem,
} from "@/features/menu/api"
import type { CartItemWithDetails } from "@/features/menu/hooks/useCart"
import { formatAmount } from "@/features/menu/utils"
import { useMenuStrings } from "@/features/menu/strings"
import { StatusChip } from "@/components/StatusChip/StatusChip"
import "./CartDrawer.css"

type Props = {
  items: CartItemWithDetails[]
  totalPrice: number
  currencySymbol: string
  isConnected: boolean
  showConnectionStatus?: boolean
  sessionExpired?: boolean
  error: string | null
  errorItemId: string | null
  displayName: string
  onChangeQuantity: (itemId: string, delta: number) => void
  onRemoveItem: (itemId: string) => void
  onClose: () => void
  onClearError: () => void
  onRetry?: () => void
  onCheckout: () => Promise<CheckoutResult>
  billItems: BillItem[]
  billLoading: boolean
  onLoadBill: () => void
  onPayBill: (orderItemIds: string[]) => Promise<void>
  onCartChanged?: () => void
}

type ReceiptTotals = {
  subtotal: number
  tax: number
  serviceCharge: number
  total: number
}

const EMPTY_TOTALS: ReceiptTotals = { subtotal: 0, tax: 0, serviceCharge: 0, total: 0 }

function isPending(ci: CartItemWithDetails): boolean {
  return ci.id.startsWith("temp-")
}

function unitPrice(ci: CartItemWithDetails): number {
  return parseFloat(ci.item?.price ?? "0") || 0
}

function lineTotal(ci: CartItemWithDetails): number {
  return unitPrice(ci) * ci.quantity
}

function getGroupLabel(
  group: ItemGroup,
  displayName: string,
  ms: ReturnType<typeof useMenuStrings>,
): string {
  if (group.isMine) {
    return displayName ? `${ms.cart.you} · ${displayName}` : ms.cart.you
  }

  if (group.displayName) {
    return group.displayName
  }

  if (group.addedBy) {
    return group.addedBy
  }

  if (group.guestSlot != null) {
    return ms.cart.slotLabel(group.guestSlot)
  }

  return ms.cart.groupedBy
}

export function CartDrawer({
  items,
  totalPrice,
  currencySymbol,
  isConnected,
  showConnectionStatus = true,
  sessionExpired = false,
  error,
  errorItemId,
  displayName,
  onChangeQuantity,
  onRemoveItem,
  onClose,
  onClearError,
  onRetry,
  onCheckout,
  billItems,
  billLoading,
  onLoadBill,
  onPayBill,
  onCartChanged,
}: Props) {
  const menuStrings = useMenuStrings()
  const [step, setStep] = useState<"cart" | "confirming" | "confirmed" | "changed" | "bill">("cart")
  const [confirmedItems, setConfirmedItems] = useState<CartItemWithDetails[]>([])
  const [confirmedTotals, setConfirmedTotals] = useState<ReceiptTotals>(EMPTY_TOTALS)
  const [submitting, setSubmitting] = useState(false)
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedToPay, setSelectedToPay] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, onClearError])

  useEffect(() => {
    if (step !== "bill") return
    const interval = setInterval(onLoadBill, 10_000)
    return () => clearInterval(interval)
  }, [step, onLoadBill])

  const handleSubmit = async () => {
    if (submitting || items.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    const snapshot = [...items]
    try {
      const result = await onCheckout()
      // Render the authoritative server breakdown (tax/service included) so the
      // receipt reconciles. Fall back to the client subtotal only if the server
      // omits the total.
      const serverTotal = parseFloat(result.total)
      if (Number.isFinite(serverTotal)) {
        setConfirmedTotals({
          subtotal: parseFloat(result.subtotal) || 0,
          tax: parseFloat(result.tax) || 0,
          serviceCharge: parseFloat(result.serviceCharge) || 0,
          total: serverTotal,
        })
      } else {
        const clientSubtotal = snapshot.reduce((s, ci) => s + lineTotal(ci), 0)
        setConfirmedTotals({
          subtotal: clientSubtotal,
          tax: 0,
          serviceCharge: 0,
          total: clientSubtotal,
        })
      }
      setConfirmedItems(snapshot)
      setStep("confirmed")
    } catch (err) {
      if (err instanceof CartChangedError) {
        setRemovedItems(err.removed)
        onCartChanged?.()
        setStep("changed")
      } else {
        setSubmitError(menuStrings.cart.checkoutError)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Clear any stale checkout error when leaving/entering the confirm dialog,
  // so a previous failure doesn't linger on the next open.
  const goToCart = () => {
    setSubmitError(null)
    setStep("cart")
  }
  const openConfirm = () => {
    setSubmitError(null)
    setStep("confirming")
  }

  // The bill is the already-ordered items; only unpaid ones are payable.
  const payableBill = billItems.filter((b) => !b.is_paid)
  const paidBill = billItems.filter((b) => b.is_paid)
  const selectedBill = payableBill.filter((b) => selectedToPay.has(b.id))
  const selectedTotal = selectedBill.reduce((s, b) => s + (parseFloat(b.payable) || 0), 0)
  const allBillSelected = payableBill.length > 0 && selectedBill.length === payableBill.length
  const billGroups = groupBillByGuest(payableBill)
  const unpaidTotal = payableBill.reduce((s, b) => s + (parseFloat(b.payable) || 0), 0)
  const paidTotal = paidBill.reduce((s, b) => s + (parseFloat(b.payable) || 0), 0)
  const billGrandTotal = unpaidTotal + paidTotal
  const paidPct = billGrandTotal > 0 ? Math.round((paidTotal / billGrandTotal) * 100) : 0

  const openBill = () => {
    setSelectedToPay(new Set())
    setStep("bill")
    onLoadBill()
  }

  const toggleSelected = (id: string) => {
    setSelectedToPay((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedToPay(allBillSelected ? new Set() : new Set(payableBill.map((b) => b.id)))
  }

  const handlePay = async () => {
    if (paying || selectedBill.length === 0) return
    setPaying(true)
    setPayError(null)
    try {
      await onPayBill(selectedBill.map((b) => b.id))
      setSelectedToPay(new Set())
    } catch {
      // Money action: surface the failure and keep the selection so the guest
      // can retry. The BE pay is idempotent, so re-submitting is safe.
      setPayError(menuStrings.cart.payError)
    } finally {
      setPaying(false)
    }
  }

  const totalCount = items.reduce((s, i) => s + i.quantity, 0)

  const groups = groupItemsByGuest(items)
  const groupedItems = [...groups.filter((g) => g.isMine), ...groups.filter((g) => !g.isMine)]

  return (
    <div
      className="cart-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="cart-drawer" aria-label={menuStrings.cart.title}>
        {/* ── Header ── */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title-row">
            <LuShoppingCart size={18} />
            <h2 className="cart-drawer__title">{menuStrings.cart.title}</h2>
            {totalCount > 0 && <span className="cart-drawer__count">{totalCount}</span>}
          </div>
          <div className="cart-drawer__header-right">
            {showConnectionStatus && (
              <span
                className={`cart-drawer__status ${isConnected ? "cart-drawer__status--connected" : "cart-drawer__status--disconnected"}`}
                title={isConnected ? menuStrings.cart.connected : menuStrings.cart.disconnected}
              >
                {isConnected ? <LuWifi size={12} /> : <LuWifiOff size={12} />}
              </span>
            )}
            <button
              className="cart-drawer__close"
              onClick={onClose}
              aria-label={menuStrings.cart.close}
            >
              <LuX size={16} />
            </button>
          </div>
        </div>

        {/* ── Cart / Bill tabs ── */}
        {(step === "cart" || step === "bill") && (
          <div className="cart-drawer__tabs" role="tablist">
            <button
              id="cart-drawer-tab-cart"
              className={`cart-drawer__tab${step === "cart" ? " cart-drawer__tab--active" : ""}`}
              role="tab"
              aria-selected={step === "cart"}
              aria-controls="cart-drawer-panel-cart"
              onClick={goToCart}
            >
              {menuStrings.cart.title}
            </button>
            <button
              id="cart-drawer-tab-bill"
              className={`cart-drawer__tab${step === "bill" ? " cart-drawer__tab--active" : ""}`}
              role="tab"
              aria-selected={step === "bill"}
              aria-controls="cart-drawer-panel-bill"
              onClick={openBill}
            >
              {menuStrings.cart.billTitle}
            </button>
          </div>
        )}

        {/* ── Session-expired notice: the socket gave up refreshing the guest
            token, so live cart sync is dead until the table is re-opened. ── */}
        {sessionExpired && (
          <div className="cart-drawer__toast" role="alert">
            <span className="cart-drawer__toast-text">{menuStrings.cart.sessionExpired}</span>
          </div>
        )}

        {/* ── Error toast ── */}
        {error && (
          <div className="cart-drawer__toast" role="alert">
            <span className="cart-drawer__toast-text">{error}</span>
            {onRetry ? (
              <button className="cart-drawer__toast-action" onClick={onRetry}>
                {menuStrings.cart.retry}
              </button>
            ) : (
              <button className="cart-drawer__toast-action" onClick={onClearError}>
                {menuStrings.cart.close}
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        {step === "confirming" ? (
          /* ── Confirm dialog ── */
          <div className="cart-drawer__confirm-dialog">
            <p className="cart-drawer__confirm-dialog-title">{menuStrings.cart.confirmTitle}</p>
            <p className="cart-drawer__confirm-dialog-sub">
              {menuStrings.cart.positions(totalCount)} · {formatAmount(totalPrice)} {currencySymbol}
            </p>
            {submitError && (
              <p className="cart-drawer__confirm-dialog-error" role="alert">
                {submitError}
              </p>
            )}
            <div className="cart-drawer__confirm-dialog-btns">
              <button
                className="cart-drawer__confirm-dialog-yes"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? menuStrings.cart.submitting : menuStrings.cart.confirmYes}
              </button>
              <button
                className="cart-drawer__confirm-dialog-no"
                onClick={goToCart}
                disabled={submitting}
              >
                {menuStrings.cart.confirmNo}
              </button>
            </div>
          </div>
        ) : step === "changed" ? (
          /* ── Items changed (unavailable removed) ── */
          <div className="cart-drawer__confirm-dialog">
            <p className="cart-drawer__confirm-dialog-title">{menuStrings.cart.changedTitle}</p>
            <p className="cart-drawer__confirm-dialog-sub">{menuStrings.cart.changedSub}</p>
            <ul className="cart-drawer__changed-list">
              {removedItems.map((r) => (
                <li key={r.id} className="cart-drawer__changed-item">
                  {r.name}
                </li>
              ))}
            </ul>
            <div className="cart-drawer__confirm-dialog-btns">
              {items.length > 0 && (
                <button
                  className="cart-drawer__confirm-dialog-yes"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? menuStrings.cart.submitting : menuStrings.cart.confirmRemaining}
                </button>
              )}
              <button
                className="cart-drawer__confirm-dialog-no"
                onClick={goToCart}
                disabled={submitting}
              >
                {menuStrings.cart.backToCart}
              </button>
            </div>
          </div>
        ) : step === "confirmed" ? (
          /* ── Confirmed ── */
          <div className="cart-drawer__confirm">
            <div className="cart-drawer__confirm-icon">
              <LuCheck size={52} strokeWidth={1.4} />
            </div>
            <h3 className="cart-drawer__confirm-title">{menuStrings.cart.confirmedTitle}</h3>
            <p className="cart-drawer__confirm-sub">{menuStrings.cart.confirmedSub}</p>

            <div className="cart-drawer__receipt">
              <p className="cart-drawer__receipt-label">{menuStrings.cart.receiptLabel}</p>
              <ul className="cart-drawer__receipt-list">
                {confirmedItems.map((ci) => (
                  <li key={ci.id} className="cart-drawer__receipt-row">
                    <span className="cart-drawer__receipt-name">
                      {ci.item?.name ?? "—"}
                      <span className="cart-drawer__receipt-qty"> × {ci.quantity}</span>
                      {ci.comment && (
                        <span className="cart-drawer__receipt-comment">{ci.comment}</span>
                      )}
                    </span>
                    <span className="cart-drawer__receipt-price">
                      {formatAmount(lineTotal(ci))} {currencySymbol}
                    </span>
                  </li>
                ))}
              </ul>
              {/* Show the tax/service breakdown only when present, so the
                  receipt reconciles (subtotal + tax + service = total). */}
              {(confirmedTotals.tax > 0 || confirmedTotals.serviceCharge > 0) && (
                <>
                  <div className="cart-drawer__receipt-line">
                    <span>{menuStrings.cart.subtotal}</span>
                    <span>
                      {formatAmount(confirmedTotals.subtotal)} {currencySymbol}
                    </span>
                  </div>
                  {confirmedTotals.tax > 0 && (
                    <div className="cart-drawer__receipt-line">
                      <span>{menuStrings.cart.tax}</span>
                      <span>
                        {formatAmount(confirmedTotals.tax)} {currencySymbol}
                      </span>
                    </div>
                  )}
                  {confirmedTotals.serviceCharge > 0 && (
                    <div className="cart-drawer__receipt-line">
                      <span>{menuStrings.cart.serviceCharge}</span>
                      <span>
                        {formatAmount(confirmedTotals.serviceCharge)} {currencySymbol}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="cart-drawer__receipt-total">
                <span>{menuStrings.cart.total}</span>
                <span>
                  {formatAmount(confirmedTotals.total)} {currencySymbol}
                </span>
              </div>
            </div>

            <button className="cart-drawer__confirm-btn" onClick={onClose}>
              {menuStrings.cart.close}
            </button>
          </div>
        ) : step === "bill" ? (
          /* ── Bill: pick items to pay (simulated) ── */
          <>
            <div
              className="cart-drawer__bill"
              id="cart-drawer-panel-bill"
              role="tabpanel"
              aria-labelledby="cart-drawer-tab-bill"
              tabIndex={0}
            >
              {billItems.length === 0 ? (
                <p className="cart-drawer__bill-empty">
                  {billLoading ? menuStrings.cart.billLoading : menuStrings.cart.billNoneToPay}
                </p>
              ) : (
                <>
                  <div className="cart-drawer__bill-summary">
                    <span className="cart-drawer__bill-summary-label">
                      {menuStrings.cart.billToPay}
                    </span>
                    <span className="cart-drawer__bill-summary-total">
                      {formatAmount(unpaidTotal)} {currencySymbol}
                    </span>
                    {paidTotal > 0 && (
                      <>
                        <div
                          className="cart-drawer__bill-progress"
                          role="progressbar"
                          aria-label={menuStrings.cart.billProgressLabel}
                          aria-valuenow={paidPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="cart-drawer__bill-progress-fill"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <span className="cart-drawer__bill-summary-sub">
                          {menuStrings.cart.billPaidOf(
                            formatAmount(paidTotal),
                            formatAmount(billGrandTotal),
                          )}{" "}
                          {currencySymbol}
                        </span>
                      </>
                    )}
                  </div>

                  {payableBill.length > 0 ? (
                    <>
                      <button
                        className="cart-drawer__bill-selectall"
                        onClick={toggleSelectAll}
                        aria-pressed={allBillSelected}
                      >
                        <span className="cart-drawer__bill-checkbox" data-checked={allBillSelected}>
                          {allBillSelected && <LuCheck size={12} />}
                        </span>
                        {menuStrings.cart.billSelectAll}
                      </button>
                      {billGroups.map((group) => {
                        const groupTotal = group.items.reduce(
                          (s, b) => s + (parseFloat(b.payable) || 0),
                          0,
                        )
                        return (
                          <div key={group.slot} className="cart-drawer__group">
                            <div className="cart-drawer__bill-group-head">
                              <span className="cart-drawer__group-label">
                                {menuStrings.cart.slotLabel(group.slot)}
                              </span>
                              <span className="cart-drawer__bill-group-total">
                                {formatAmount(groupTotal)} {currencySymbol}
                              </span>
                            </div>
                            <ul className="cart-drawer__bill-list">
                              {group.items.map((b) => {
                                const checked = selectedToPay.has(b.id)
                                return (
                                  <li key={b.id}>
                                    <button
                                      className={`cart-drawer__bill-item${checked ? " cart-drawer__bill-item--checked" : ""}`}
                                      onClick={() => toggleSelected(b.id)}
                                      aria-pressed={checked}
                                    >
                                      <span
                                        className="cart-drawer__bill-checkbox"
                                        data-checked={checked}
                                      >
                                        {checked && <LuCheck size={12} />}
                                      </span>
                                      <span className="cart-drawer__bill-name">
                                        {b.name}
                                        <span className="cart-drawer__receipt-qty">
                                          {" "}
                                          × {b.quantity}
                                        </span>
                                      </span>
                                      <StatusChip status={b.status} />
                                      <span className="cart-drawer__bill-price">
                                        {formatAmount(parseFloat(b.payable) || 0)} {currencySymbol}
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <p className="cart-drawer__bill-empty">{menuStrings.cart.billAllPaid}</p>
                  )}

                  {paidBill.length > 0 && (
                    <>
                      <span className="cart-drawer__bill-paid-label">
                        {menuStrings.cart.billPaidLabel}
                      </span>
                      <ul className="cart-drawer__bill-list">
                        {paidBill.map((b) => (
                          <li
                            key={b.id}
                            className="cart-drawer__bill-item cart-drawer__bill-item--paid"
                          >
                            <span className="cart-drawer__bill-paid-check">
                              <LuCheck size={13} />
                            </span>
                            <span className="cart-drawer__bill-name">
                              {b.name}
                              <span className="cart-drawer__receipt-qty"> × {b.quantity}</span>
                            </span>
                            <StatusChip status={b.status} />
                            <span className="cart-drawer__bill-price">
                              {formatAmount(parseFloat(b.payable) || 0)} {currencySymbol}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total-row">
                <span className="cart-drawer__total-label">{menuStrings.cart.billSelected}</span>
                <span className="cart-drawer__total-value">
                  {formatAmount(selectedTotal)} {currencySymbol}
                </span>
              </div>
              {payError && (
                <p className="cart-drawer__confirm-dialog-error" role="alert">
                  {payError}
                </p>
              )}
              <button
                className="cart-drawer__order"
                onClick={handlePay}
                disabled={paying || selectedBill.length === 0}
              >
                {paying
                  ? menuStrings.cart.paying
                  : selectedBill.length > 0
                    ? `${menuStrings.cart.pay} · ${formatAmount(selectedTotal)} ${currencySymbol}`
                    : menuStrings.cart.pay}
              </button>
            </div>
          </>
        ) : items.length === 0 ? (
          /* ── Empty ── */
          <div className="cart-drawer__empty">
            <LuShoppingCart size={48} strokeWidth={1.2} />
            <p className="cart-drawer__empty-title">{menuStrings.cart.emptyTitle}</p>
            <p className="cart-drawer__empty-sub">{menuStrings.cart.emptySub}</p>
          </div>
        ) : (
          /* ── Item list grouped by guest ── */
          <>
            <div
              className="cart-drawer__list"
              id="cart-drawer-panel-cart"
              role="tabpanel"
              aria-labelledby="cart-drawer-tab-cart"
              tabIndex={0}
            >
              {groupedItems.map((group) => (
                <div key={group.key} className="cart-drawer__group">
                  <span className="cart-drawer__group-label">
                    {getGroupLabel(group, displayName, menuStrings)}
                  </span>
                  <ul className="cart-drawer__group-list">
                    {group.items.map((ci) => (
                      <li
                        key={ci.id}
                        className={`cart-drawer__item${ci.id === errorItemId ? " cart-drawer__item--error" : ""}`}
                      >
                        {ci.item?.image ? (
                          <img
                            className="cart-drawer__item-img"
                            src={ci.item.image}
                            alt={ci.item.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="cart-drawer__item-img-placeholder" />
                        )}

                        <div className="cart-drawer__item-body">
                          <span className="cart-drawer__item-name">{ci.item?.name ?? "—"}</span>
                          <span className="cart-drawer__item-unit-price">
                            {formatAmount(unitPrice(ci))} {currencySymbol}{" "}
                            {menuStrings.cart.perUnit}
                          </span>
                          {ci.comment && (
                            <span className="cart-drawer__item-comment">{ci.comment}</span>
                          )}
                        </div>

                        <div className="cart-drawer__item-right">
                          <span className="cart-drawer__item-total">
                            {formatAmount(lineTotal(ci))} {currencySymbol}
                          </span>
                          <div className="cart-drawer__stepper">
                            <button
                              className="cart-drawer__stepper-btn"
                              onClick={() =>
                                ci.quantity === 1
                                  ? onRemoveItem(ci.id)
                                  : onChangeQuantity(ci.id, -1)
                              }
                              disabled={isPending(ci)}
                              aria-label={menuStrings.cart.decrease}
                            >
                              {ci.quantity === 1 ? <LuTrash2 size={12} /> : <LuMinus size={12} />}
                            </button>
                            <span className="cart-drawer__qty">{ci.quantity}</span>
                            <button
                              className="cart-drawer__stepper-btn"
                              onClick={() => onChangeQuantity(ci.id, 1)}
                              disabled={isPending(ci)}
                              aria-label={menuStrings.cart.increase}
                            >
                              <LuPlus size={12} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total-row">
                <span className="cart-drawer__total-label">{menuStrings.cart.total}</span>
                <span className="cart-drawer__total-value">
                  {formatAmount(totalPrice)} {currencySymbol}
                </span>
              </div>
              <button
                className="cart-drawer__order"
                onClick={openConfirm}
                disabled={items.length === 0}
              >
                {menuStrings.cart.checkout}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

type ItemGroup = {
  key: string
  guestSlot: number | null
  isMine: boolean
  addedBy: string | null
  displayName: string | null
  items: CartItemWithDetails[]
}

type BillGroup = { slot: number; items: BillItem[] }

// Group bill lines by the guest who ordered them (guest_slot), slot ascending.
function groupBillByGuest(items: BillItem[]): BillGroup[] {
  const groups = new Map<number, BillGroup>()
  for (const item of items) {
    let group = groups.get(item.guest_slot)
    if (!group) {
      group = { slot: item.guest_slot, items: [] }
      groups.set(item.guest_slot, group)
    }
    group.items.push(item)
  }
  return Array.from(groups.values()).sort((a, b) => a.slot - b.slot)
}

function groupItemsByGuest(items: CartItemWithDetails[]): ItemGroup[] {
  const groups = new Map<string, ItemGroup>()

  for (const item of items) {
    const key = item.isMine
      ? "mine"
      : item.displayName
        ? `name-${item.displayName}`
        : item.addedBy
          ? `user-${item.addedBy}`
          : item.guestSlot != null
            ? `slot-${item.guestSlot}`
            : "ungrouped"

    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        guestSlot: item.guestSlot,
        isMine: item.isMine,
        addedBy: item.addedBy,
        displayName: item.displayName,
        items: [],
      }
      groups.set(key, group)
    }
    group.items.push(item)
  }

  return Array.from(groups.values())
}
