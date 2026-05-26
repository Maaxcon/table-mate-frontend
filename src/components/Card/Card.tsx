import type { HTMLAttributes, PropsWithChildren } from "react"
import "./Card.css"

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

function Card({ children, className, ...rest }: CardProps) {
  const classes = className ? `tm-card ${className}` : "tm-card"

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

export default Card
