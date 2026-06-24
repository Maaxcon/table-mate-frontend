import type { ReactNode } from "react"
import Card from "@/components/Card"
import { authStrings } from "@/features/auth/strings"
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
        <span>{authStrings.socialAuth.googleButton}</span>
      </button>

      <div className="social-auth-group__feedback">
        <p className="social-auth-group__feedback--success" role="status">
          {googleFeedbackType === "error" ? "" : googleFeedback}
        </p>
        <p className="social-auth-group__feedback--error" role="alert">
          {googleFeedbackType === "error" ? googleFeedback : ""}
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
