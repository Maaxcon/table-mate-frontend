import Divider from "@/components/Divider"
import { AuthHero, GuestAccess, SocialAuthGroup } from "@/features/auth/components"
import { useGoogleRedirectAuth } from "@/hooks/auth"
import AuthLayout from "@/layouts/AuthLayout"
import "./GreetingPage.css"

function GreetingPage() {
  const { googleFeedback, googleFeedbackType, handleGoogleLogin } = useGoogleRedirectAuth()

  return (
    <AuthLayout>
      <section className="greeting-page">
        <AuthHero />
        <SocialAuthGroup
          onGoogleLogin={handleGoogleLogin}
          googleFeedback={googleFeedback}
          googleFeedbackType={googleFeedbackType}
        />
        <GuestAccess />
        <Divider className="greeting-page__divider" />
        <p className="greeting-page__footer">Welcome to Cherkasy&apos;s culinary guide.</p>
      </section>
    </AuthLayout>
  )
}

export default GreetingPage
