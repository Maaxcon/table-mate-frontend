import type { HTMLAttributes, PropsWithChildren } from "react"
import "./AuthLayout.css"

type AuthLayoutProps = PropsWithChildren<HTMLAttributes<HTMLElement>>

function AuthLayout({ children, className, ...rest }: AuthLayoutProps) {
  const classes = ["auth-layout", className].filter(Boolean).join(" ")

  return (
    <main className={classes} {...rest}>
      {children}
    </main>
  )
}

export type { AuthLayoutProps }
export default AuthLayout
