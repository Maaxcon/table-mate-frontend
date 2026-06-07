import { type ReactNode } from "react"
import { LuX } from "react-icons/lu"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import "@/features/admin/components/styles/modal.css"

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** "dialog" (default) or "alertdialog" for confirmations. */
  role?: "dialog" | "alertdialog"
  /** Accessible name; defaults to the title. */
  ariaLabel?: string
  /** Show the header's "✕" close button (default true). */
  showClose?: boolean
  /** Block closing via Esc, backdrop, or the ✕ (e.g. while an action runs). */
  closeDisabled?: boolean
  /** False when another modal is stacked on top: suspends this one's focus
   * trap and Esc handling so the topmost modal owns them. */
  active?: boolean
  /** Extra class on the dialog box (e.g. "admin-modal--dish"). */
  className?: string
  /** Extra class on the overlay (e.g. "admin-confirm__overlay"). */
  overlayClassName?: string
  /** Accessible label for the backdrop button (default "Close"). */
  backdropLabel?: string
}

/**
 * Shared modal shell: overlay, backdrop, header, role/aria, Esc-to-close, and a
 * focus trap (focuses the first field on open, restores focus on close). Keeps
 * this behavior in one place so dialogs can't drift apart.
 */
function Modal({
  title,
  onClose,
  children,
  role = "dialog",
  ariaLabel,
  showClose = true,
  closeDisabled = false,
  active = true,
  className,
  overlayClassName,
  backdropLabel = "Close",
}: ModalProps) {
  // Focus trap + Esc-to-close, both suspended when another modal is stacked on
  // top (active=false) or an action is running (closeDisabled).
  const dialogRef = useFocusTrap<HTMLDivElement>({
    active,
    preferFields: true,
    onEscape: closeDisabled ? undefined : onClose,
  })

  const requestClose = () => {
    if (!closeDisabled) onClose()
  }

  return (
    <div className={`admin-modal__overlay${overlayClassName ? ` ${overlayClassName}` : ""}`}>
      <button
        type="button"
        className="admin-modal__backdrop"
        aria-label={backdropLabel}
        onClick={requestClose}
      />
      <div
        ref={dialogRef}
        className={`admin-modal${className ? ` ${className}` : ""}`}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        <div className="admin-modal__header">
          <h2 className="admin-modal__title">{title}</h2>
          {showClose && (
            <button
              type="button"
              className="admin-modal__close"
              onClick={requestClose}
              aria-label="Close"
            >
              <LuX aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
