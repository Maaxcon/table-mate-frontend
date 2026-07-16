import { createPortal } from "react-dom"
import { LuCircleCheck, LuCircleX } from "react-icons/lu"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { useCabinetStrings } from "@/features/cabinet/strings"
import "./FeedbackDialog.css"

type FeedbackDialogProps = {
  variant: "success" | "error"
  title: string
  message?: string
  onClose: () => void
}

export function FeedbackDialog({ variant, title, message, onClose }: FeedbackDialogProps) {
  const strings = useCabinetStrings()
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

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
          {strings.feedback.ok}
        </button>
      </div>
    </div>,
    document.body,
  )
}
