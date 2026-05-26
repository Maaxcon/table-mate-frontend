import type { HTMLAttributes } from "react"
import "./Divider.css"

type DividerProps = HTMLAttributes<HTMLHRElement>

function Divider({ className, ...rest }: DividerProps) {
  const classes = ["tm-divider", className].filter(Boolean).join(" ")

  return <hr className={classes} {...rest} />
}

export type { DividerProps }
export default Divider
