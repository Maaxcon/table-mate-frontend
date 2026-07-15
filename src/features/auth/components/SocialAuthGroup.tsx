import { useEffect, useState, type ReactNode } from "react"
import { useAuthStrings } from "@/features/auth/strings"
import Card from "@/components/Card"
import type { GoogleFeedbackType } from "@/features/auth/types"
import { FcGoogle } from "react-icons/fc"
import "./SocialAuthGroup.css"

type SocialAuthGroupProps = {
  onGoogleLogin: () => void
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
  loading?: boolean
  children?: ReactNode
}

function SocialAuthGroup({
  onGoogleLogin,
  googleFeedback,
  googleFeedbackType,
  loading = false,
  children,
}: SocialAuthGroupProps) {
  // Live regions only announce content that changes after they mount. The
  // feedback can already be set on first render (e.g. a redirect error), so we
  // start empty and fill it in an effect to force the change screen readers
  // need to hear.
  const authStrings = useAuthStrings()
  const [liveFeedback, setLiveFeedback] = useState("")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring to a post-mount render is what makes the live region announce
    setLiveFeedback(googleFeedback)
  }, [googleFeedback])

  return (
    <Card className="social-auth-group">
      <h2 className="social-auth-group__title">{authStrings.socialAuth.title}</h2>
      <p className="social-auth-group__text">{authStrings.socialAuth.text}</p>

      <button
        aria-busy={loading}
        className="social-auth-group__google"
        disabled={loading}
        onClick={onGoogleLogin}
        type="button"
      >
        {loading ? (
          <span aria-hidden="true" className="social-auth-group__spinner" />
        ) : (
          <FcGoogle aria-hidden="true" className="social-auth-group__google-icon" size={20} />
        )}
        <span>
          {loading
            ? authStrings.socialAuth.googleButtonLoading
            : authStrings.socialAuth.googleButton}
        </span>
      </button>

      <div className="social-auth-group__feedback">
        <p className="social-auth-group__feedback--success" role="status">
          {googleFeedbackType === "error" ? "" : liveFeedback}
        </p>
        <p className="social-auth-group__feedback--error" role="alert">
          {googleFeedbackType === "error" ? liveFeedback : ""}
        </p>
      </div>

      {children ? (
        <>
          <div aria-hidden="true" className="social-auth-group__or">
            {authStrings.socialAuth.or}
          </div>
          {children}
        </>
      ) : null}
    </Card>
  )
}

export type { SocialAuthGroupProps }
export default SocialAuthGroup
