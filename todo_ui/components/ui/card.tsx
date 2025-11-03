import * as React from "react"
import { cardStyles } from "./card.styles"

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className = "", ...props }: CardProps) {
  return <div className={`${cardStyles.root} ${className}`} {...props} />
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return <header className={`${cardStyles.header} ${className}`} {...props} />
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={`${cardStyles.content} ${className}`} {...props} />
}

export function CardFooter({ className = "", ...props }: CardProps) {
  return <footer className={`${cardStyles.footer} ${className}`} {...props} />
}
