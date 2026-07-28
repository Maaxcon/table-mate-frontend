import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import {
  LuBanknote,
  LuChevronRight,
  LuCreditCard,
  LuDownload,
  LuMapPin,
  LuMessageSquare,
  LuPhone,
  LuShare2,
  LuX,
} from "react-icons/lu"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { HistoryEntry } from "@/features/cabinet/types"
import { loadReceiptFont } from "@/features/cabinet/receiptFont"
import { buildReceiptPdf } from "@/features/cabinet/receiptPdf"
import { formatDateTime, formatMoney } from "@/features/cabinet/utils"
import { FeedbackDialog } from "@/features/cabinet/components/FeedbackDialog/FeedbackDialog"
import { FeedbackModal } from "@/features/feedback/components/FeedbackModal"
import { downloadBlob } from "@/utils/downloadBlob"
import "./ReceiptDialog.css"

type ReceiptDialogProps = {
  entry: HistoryEntry
  onClose: () => void
}

function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false
  try {
    const probe = new File([new Blob()], "probe.pdf", { type: "application/pdf" })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export function ReceiptDialog({ entry, onClose }: ReceiptDialogProps) {
  const strings = useCabinetStrings()
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })
  const shareMode = useMemo(() => canShareFiles(), [])
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const openMenu = () => {
    if (!entry.restaurantId) return
    onClose()
    navigate(`/menu/${entry.restaurantId}`)
  }

  useEffect(() => {
    void loadReceiptFont()
  }, [])

  const itemCount = entry.items.reduce((n, i) => n + i.quantity, 0)
  const money = (amount: number) => formatMoney(amount, entry.currency)

  const handleSaveOrShare = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { blob, filename } = await buildReceiptPdf(entry)

      if (shareMode) {
        const file = new File([blob], filename, { type: "application/pdf" })
        try {
          await navigator.share({ files: [file], title: filename })
        } catch {
          // user cancelled the share sheet — not an error
        }
        return
      }

      downloadBlob(blob, filename)
    } catch {
      setError(strings.receipt.errorMessage)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="receipt-dialog__overlay">
      <button
        type="button"
        className="receipt-dialog__backdrop"
        aria-label={strings.receipt.closeAria}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="receipt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-dialog-title"
      >
        <button
          type="button"
          className="receipt-dialog__close"
          onClick={onClose}
          aria-label={strings.receipt.closeAria}
        >
          <LuX aria-hidden="true" />
        </button>

        <button
          type="button"
          className="receipt-dialog__cover"
          onClick={openMenu}
          aria-label={strings.receipt.openMenuAria(entry.restaurantName)}
        >
          <img className="receipt-dialog__cover-img" src={entry.restaurantImage} alt="" />
          <span className="receipt-dialog__title" id="receipt-dialog-title">
            {entry.restaurantName}
          </span>
          <span className="receipt-dialog__cover-cta">
            {strings.receipt.viewMenu} <LuChevronRight aria-hidden="true" />
          </span>
        </button>

        <div className="receipt-dialog__scroll">
          <header className="receipt-dialog__brand">
            <p className="receipt-dialog__brand-line">
              <LuMapPin aria-hidden="true" /> {entry.restaurantAddress}
            </p>
            <p className="receipt-dialog__brand-line">
              <LuPhone aria-hidden="true" /> {entry.restaurantPhone}
            </p>
          </header>

          <div className="receipt-dialog__divider" />

          <dl className="receipt-dialog__meta">
            <div>
              <dt>{strings.receipt.receipt}</dt>
              <dd>{entry.orderNumber}</dd>
            </div>
            <div>
              <dt>{strings.receipt.date}</dt>
              <dd>{formatDateTime(entry.date, strings.locale)}</dd>
            </div>
            <div>
              <dt>{strings.receipt.table}</dt>
              <dd>{entry.tableLabel}</dd>
            </div>
            <div>
              <dt>{strings.receipt.server}</dt>
              <dd>{entry.server}</dd>
            </div>
            <div>
              <dt>{strings.receipt.guests}</dt>
              <dd>{entry.guests}</dd>
            </div>
          </dl>

          <div className="receipt-dialog__divider receipt-dialog__divider--dashed" />

          <ul className="receipt-dialog__items">
            {entry.items.map((item, index) => (
              <li className="receipt-line" key={`${item.name}-${index}`}>
                <span className="receipt-line__qty">{item.quantity}×</span>
                <span className="receipt-line__name">
                  {item.name}
                  <span className="receipt-line__unit">
                    {money(item.unitPrice)} {strings.receipt.each}
                  </span>
                </span>
                <span className="receipt-line__price">{money(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="receipt-dialog__divider receipt-dialog__divider--dashed" />

          <div className="receipt-dialog__totals">
            <div className="receipt-row">
              <span>{strings.receipt.subtotal(itemCount)}</span>
              <span>{money(entry.subtotal)}</span>
            </div>
            <div className="receipt-row">
              <span>{strings.receipt.tax}</span>
              <span>{money(entry.tax)}</span>
            </div>
            <div className="receipt-row">
              <span>{strings.receipt.serviceCharge}</span>
              <span>{money(entry.serviceCharge)}</span>
            </div>
            <div className="receipt-row">
              <span>{strings.receipt.tip}</span>
              <span>{money(entry.tip)}</span>
            </div>
            <div className="receipt-row receipt-row--grand">
              <span>{strings.receipt.total}</span>
              <span>{money(entry.total)}</span>
            </div>
          </div>

          <div className="receipt-dialog__payment">
            <span className="receipt-dialog__pay-method">
              {entry.paymentMethod === "card" ? (
                <LuCreditCard aria-hidden="true" />
              ) : (
                <LuBanknote aria-hidden="true" />
              )}
              {entry.paymentMethod === "card" ? strings.receipt.card : strings.receipt.cash}
            </span>
            <span className="receipt-dialog__pay-status">{entry.paymentStatus}</span>
          </div>

          <button
            type="button"
            className="receipt-dialog__action"
            onClick={() => void handleSaveOrShare()}
            disabled={busy}
          >
            {shareMode ? <LuShare2 aria-hidden="true" /> : <LuDownload aria-hidden="true" />}
            {busy
              ? strings.receipt.preparing
              : shareMode
                ? strings.receipt.share
                : strings.receipt.savePdf}
          </button>

          {entry.orderId && (
            <button
              type="button"
              className="receipt-dialog__action receipt-dialog__action--secondary"
              onClick={() => setFeedbackOpen(true)}
            >
              <LuMessageSquare aria-hidden="true" size={16} />
              {strings.receipt.leaveFeedback}
            </button>
          )}

          <p className="receipt-dialog__thanks">{strings.receipt.thanks}</p>
        </div>
      </div>

      {error && (
        <FeedbackDialog
          variant="error"
          title={strings.receipt.errorTitle}
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {feedbackOpen && entry.orderId && (
        <FeedbackModal
          orderPublicId={entry.orderId}
          orderItems={entry.items.flatMap((item) =>
            item.publicId ? [{ public_id: item.publicId, name: item.name }] : [],
          )}
          onClose={() => setFeedbackOpen(false)}
          onSuccess={() => setFeedbackOpen(false)}
        />
      )}
    </div>,
    document.body,
  )
}
