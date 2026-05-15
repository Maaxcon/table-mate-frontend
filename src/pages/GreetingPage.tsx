import Divider from "@/components/Divider"
import { AuthHero, GuestAccess, SocialAuthGroup } from "@/features/auth/components"
import AuthLayout from "@/layouts/AuthLayout"
import "./GreetingPage.css"

function GreetingPage() {
  return (
    <AuthLayout>
      <section className="greeting-page">
        <AuthHero />
        <SocialAuthGroup />
        <GuestAccess />
        <Divider className="greeting-page__divider" />
        <p className="greeting-page__footer">Welcome to Cherkasy&apos;s culinary guide.</p>
      </section>
    </AuthLayout>
  )
}

export default GreetingPage
