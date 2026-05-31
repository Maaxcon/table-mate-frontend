import { createPortal } from "react-dom"
import { LuCircleCheck, LuCircleX } from "react-icons/lu"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import "./FeedbackDialog.css"

type FeedbackDialogProps = {
  variant: "success" | "error"
  title: string
  message?: string
  onClose: () => void
}

export function FeedbackDialog({ variant, title, message, onClose }: FeedbackDialogProps) {
  // Focus trap + Escape; this is an alert dialog, so it is dismissed only via
  // its OK button or Escape (no backdrop click).
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose)

  // Render outside the cabinet card: an ancestor `transform` (the card's hover
  // animation) would otherwise anchor this fixed overlay to the card and make
  // it flicker. A portal to <body> keeps it relative to the viewport.
  return createPortal(
    <div className="feedback-dialog__overlay">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`feedback-dialog feedback-dialog--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <div className="feedback-dialog__icon" aria-hidden="true">
          {variant === "success" ? <LuCircleCheck /> : <LuCircleX />}
        </div>
        <h2 className="feedback-dialog__title" id="feedback-dialog-title">
          {title}
        </h2>
        {message && <p className="feedback-dialog__message">{message}</p>}
        <button type="button" className="feedback-dialog__btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  )
}
