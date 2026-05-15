import { IconButton } from "@/components/Button"
import Card from "@/components/Card"
import { FcGoogle } from "react-icons/fc"
import "./SocialAuthGroup.css"

type SocialAuthGroupProps = {
  onGoogleLogin?: () => void
}

function SocialAuthGroup({ onGoogleLogin }: SocialAuthGroupProps) {
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
    </Card>
  )
}

export type { SocialAuthGroupProps }
export default SocialAuthGroup
