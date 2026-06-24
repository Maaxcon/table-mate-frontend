import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Divider from "@/components/Divider"
import { AuthHero, GuestAccess, SocialAuthGroup } from "@/features/auth/components"
import { useGoogleRedirectAuth } from "@/features/auth/hooks"
import { authStrings } from "@/features/auth/strings"
import AuthLayout from "@/layouts/AuthLayout"
import "./GreetingPage.css"

function GreetingPage() {
  const navigate = useNavigate()
  const { googleFeedback, googleFeedbackType, handleGoogleLogin, loading } = useGoogleRedirectAuth()
  const handleContinueAsGuest = useCallback(() => navigate("/restaurants"), [navigate])

  return (
    <AuthLayout data-theme="light">
      <section className="greeting-page">
        <AuthHero />
        <SocialAuthGroup
          onGoogleLogin={handleGoogleLogin}
          googleFeedback={googleFeedback}
          googleFeedbackType={googleFeedbackType}
          loading={loading}
        >
          <GuestAccess onContinueAsGuest={handleContinueAsGuest} />
        </SocialAuthGroup>
        <Divider className="greeting-page__divider" />
        <p className="greeting-page__footer">{authStrings.footer}</p>
      </section>
    </AuthLayout>
  )
}

export default GreetingPage
