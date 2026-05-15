import logo from "@/assets/logo.png"
import "./AuthHero.css"

function AuthHero() {
  return (
    <section className="auth-hero">
      <img alt="TableMate logo" className="auth-hero__logo" src={logo} />
      <h1 className="auth-hero__title">TABLEMATE</h1>
      <p className="auth-hero__subtitle">Discover, book, and dine. Effortlessly.</p>
    </section>
  )
}

export default AuthHero
