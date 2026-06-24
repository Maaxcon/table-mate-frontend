import logo from "@/assets/logo.png"
import { authStrings } from "@/features/auth/strings"
import "./AuthHero.css"

function AuthHero() {
  return (
    <section className="auth-hero">
      <h1 className="auth-hero__brand">
        <img alt={authStrings.hero.logoAlt} className="auth-hero__logo" src={logo} />
      </h1>
      <p className="auth-hero__subtitle">{authStrings.hero.subtitle}</p>
    </section>
  )
}

export default AuthHero
