import type { MouseEventHandler, ReactNode } from "react"
import "./Button.css"

type ButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

function Button({ children, className, disabled = false, onClick, type = "button" }: ButtonProps) {
  const classes = ["tm-button", className].filter(Boolean).join(" ")

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  )
}

export type { ButtonProps }
export default Button
