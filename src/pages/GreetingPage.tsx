import { useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Divider from "@/components/Divider"
import { AuthHero, GuestAccess, SocialAuthGroup } from "@/features/auth/components"
import { useGoogleRedirectAuth } from "@/features/auth/hooks"
import AuthLayout from "@/layouts/AuthLayout"
import "./GreetingPage.css"

function GreetingPage() {
  const navigate = useNavigate()
  const { googleFeedback, googleFeedbackType, handleGoogleLogin, loading } = useGoogleRedirectAuth()
  const handleContinueAsGuest = useCallback(() => navigate("/restaurants"), [navigate])

  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute("data-theme")
    root.setAttribute("data-theme", "light")
    return () => {
      if (prev) root.setAttribute("data-theme", prev)
      else root.removeAttribute("data-theme")
    }
  }, [])

  return (
    <AuthLayout>
      <section className="greeting-page">
        <AuthHero />
        <SocialAuthGroup
          onGoogleLogin={handleGoogleLogin}
          googleFeedback={googleFeedback}
          googleFeedbackType={googleFeedbackType}
          loading={loading}
        />
        <GuestAccess onContinueAsGuest={handleContinueAsGuest} />
        <Divider className="greeting-page__divider" />
        <p className="greeting-page__footer">Welcome to Cherkasy&apos;s culinary guide.</p>
      </section>
    </AuthLayout>
  )
}

export default GreetingPage
