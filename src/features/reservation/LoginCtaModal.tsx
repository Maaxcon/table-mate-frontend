import "./LoginCtaModal.css"

interface LoginCtaModalProps {
  onClose: () => void
}

export function LoginCtaModal({ onClose }: LoginCtaModalProps) {
  return (
    <>
      <div
        className="login-cta-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose()
        }}
      >
        <div className="login-cta-modal">
          <p className="login-cta-modal__text">You need to log in to make a reservation.</p>
          <div className="login-cta-modal__actions">
            <a className="login-cta-modal__btn login-cta-modal__btn--login" href="/">
              LOG IN
            </a>
            <button
              className="login-cta-modal__btn login-cta-modal__btn--cancel"
              onClick={onClose}
              type="button"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
