import type { PropsWithChildren } from "react"
import "./AuthLayout.css"

type AuthLayoutProps = PropsWithChildren

function AuthLayout({ children }: AuthLayoutProps) {
  return <main className="auth-layout">{children}</main>
}

export type { AuthLayoutProps }
export default AuthLayout
