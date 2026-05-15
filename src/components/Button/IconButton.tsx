import type { MouseEventHandler, ReactNode } from "react"
import "./IconButton.css"

type IconButtonProps = {
  icon: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  ariaLabel: string
}

function IconButton({
  ariaLabel,
  className,
  disabled = false,
  icon,
  onClick,
  type = "button",
}: IconButtonProps) {
  const classes = ["tm-icon-button", className].filter(Boolean).join(" ")

  return (
    <button
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span className="tm-icon-button__icon">{icon}</span>
    </button>
  )
}

export type { IconButtonProps }
export default IconButton
