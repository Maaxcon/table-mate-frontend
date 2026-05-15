import { IconButton } from "@/components/Button"
import Card from "@/components/Card"
import type { GoogleFeedbackType } from "@/types/auth/googleAuth"
import { FcGoogle } from "react-icons/fc"
import "./SocialAuthGroup.css"

type SocialAuthGroupProps = {
  onGoogleLogin?: () => void
  googleFeedback?: string
  googleFeedbackType?: GoogleFeedbackType
}

function SocialAuthGroup({
  onGoogleLogin,
  googleFeedback,
  googleFeedbackType,
}: SocialAuthGroupProps) {
  return (
    <Card className="social-auth-group">
      <h2 className="social-auth-group__title">Create Profile</h2>
      <p className="social-auth-group__text">Unlock one-tap booking, favorites, and history.</p>

      <div className="social-auth-group__icons social-auth-group__icons--single">
        <IconButton
          ariaLabel="Sign in with Google"
          icon={<FcGoogle size={24} />}
          onClick={onGoogleLogin}
        />
      </div>

      {googleFeedback ? (
        <p
          className={`social-auth-group__feedback social-auth-group__feedback--${googleFeedbackType ?? "success"}`}
        >
          {googleFeedback}
        </p>
      ) : null}
    </Card>
  )
}

export type { SocialAuthGroupProps }
export default SocialAuthGroup
