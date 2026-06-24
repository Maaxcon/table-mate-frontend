import Card from "@/components/Card"
import type { GoogleFeedbackType } from "@/features/auth/types"
import { FcGoogle } from "react-icons/fc"
import "./SocialAuthGroup.css"

type SocialAuthGroupProps = {
  onGoogleLogin: () => void
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
}

function SocialAuthGroup({
  onGoogleLogin,
  googleFeedback,
  googleFeedbackType,
}: SocialAuthGroupProps) {
  return (
    <Card className="social-auth-group">
      <h2 className="social-auth-group__title">Get started</h2>
      <p className="social-auth-group__text">Unlock one-tap booking, favorites, and history.</p>

      <button className="social-auth-group__google" onClick={onGoogleLogin} type="button">
        <FcGoogle aria-hidden="true" className="social-auth-group__google-icon" size={20} />
        <span>Continue with Google</span>
      </button>

      {googleFeedback ? (
        <p
          className={`social-auth-group__feedback social-auth-group__feedback--${googleFeedbackType}`}
        >
          {googleFeedback}
        </p>
      ) : null}
    </Card>
  )
}

export type { SocialAuthGroupProps }
export default SocialAuthGroup
