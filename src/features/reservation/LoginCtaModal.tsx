import { useFocusTrap } from "@/hooks/useFocusTrap"
import { bookStrings } from "./strings"
import "./LoginCtaModal.css"

interface LoginCtaModalProps {
  onClose: () => void
}

export function LoginCtaModal({ onClose }: LoginCtaModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

  return (
    <div
      className="login-cta-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="login-cta-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-cta-text"
      >
        <p className="login-cta-modal__text" id="login-cta-text">
          {bookStrings.loginCta.text}
        </p>
        <div className="login-cta-modal__actions">
          <a className="login-cta-modal__btn login-cta-modal__btn--login" href="/">
            {bookStrings.loginCta.login}
          </a>
          <button
            className="login-cta-modal__btn login-cta-modal__btn--cancel"
            onClick={onClose}
            type="button"
          >
            {bookStrings.loginCta.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
