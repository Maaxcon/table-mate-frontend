import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Divider from "@/components/Divider"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthHero, GuestAccess, SocialAuthGroup } from "@/features/auth/components"
import { useGoogleRedirectAuth } from "@/features/auth/hooks"
import { googleAuthMessage } from "@/features/auth/hooks/googleAuth.constants"
import { useAuthStrings } from "@/features/auth/strings"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import AuthLayout from "@/layouts/AuthLayout"
import type { GoogleFeedbackType } from "@/features/auth/types"
import "./GreetingPage.css"

type GreetingPageContentProps = {
  onGoogleLogin: () => void
  googleFeedback: string
  googleFeedbackType: GoogleFeedbackType
  loading: boolean
  googleDisabled?: boolean
}

function GreetingPageContent({
  onGoogleLogin,
  googleFeedback,
  googleFeedbackType,
  loading,
  googleDisabled = false,
}: GreetingPageContentProps) {
  const authStrings = useAuthStrings()
  const navigate = useNavigate()
  const handleContinueAsGuest = useCallback(() => navigate("/restaurants"), [navigate])

  return (
    <AuthLayout data-theme="dark">
      <section className="greeting-page">
        <AuthHero />
        <SocialAuthGroup
          disabled={googleDisabled}
          onGoogleLogin={onGoogleLogin}
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

function GreetingPageGoogleBody() {
  const { googleFeedback, googleFeedbackType, handleGoogleLogin, loading } = useGoogleRedirectAuth()

  return (
    <GreetingPageContent
      onGoogleLogin={handleGoogleLogin}
      googleFeedback={googleFeedback}
      googleFeedbackType={googleFeedbackType}
      loading={loading}
    />
  )
}

function GreetingPageWithGoogle() {
  return (
    <GoogleOAuthProvider clientId={env.googleClientId}>
      <GreetingPageGoogleBody />
    </GoogleOAuthProvider>
  )
}

function GreetingPageWithoutGoogle() {
  return (
    <GreetingPageContent
      onGoogleLogin={() => {}}
      googleFeedback={googleAuthMessage.unavailable}
      googleFeedbackType="error"
      loading={false}
      googleDisabled
    />
  )
}

function GreetingPage() {
  if (env.googleClientId === ENV_NOT_CONFIGURED_VALUE) {
    return <GreetingPageWithoutGoogle />
  }

  return <GreetingPageWithGoogle />
}

export default GreetingPage
