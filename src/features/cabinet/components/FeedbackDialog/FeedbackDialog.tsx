import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { LuCircleCheck, LuCircleX } from "react-icons/lu"
import "./FeedbackDialog.css"

type FeedbackDialogProps = {
  variant: "success" | "error"
  title: string
  message?: string
  onClose: () => void
}

export function FeedbackDialog({ variant, title, message, onClose }: FeedbackDialogProps) {
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Render outside the cabinet card: an ancestor `transform` (the card's hover
  // animation) would otherwise anchor this fixed overlay to the card and make
  // it flicker. A portal to <body> keeps it relative to the viewport.
  return createPortal(
    <div className="feedback-dialog__overlay">
      <div
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
        <button ref={okRef} type="button" className="feedback-dialog__btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  )
}
