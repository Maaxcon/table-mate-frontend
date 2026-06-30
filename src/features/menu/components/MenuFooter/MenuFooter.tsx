import { menuStrings } from "@/features/menu/strings"
import "./MenuFooter.css"

type MenuFooterProps = {
  restaurantName: string | null
}

/** Minimal closing footer: brand wordmark, tagline and copyright. */
function MenuFooter({ restaurantName }: MenuFooterProps) {
  const year = new Date().getFullYear()
  return (
    <footer className="menu-footer">
      <span className="menu-footer__brand">{menuStrings.footer.brand}</span>
      <span className="menu-footer__tagline">{menuStrings.footer.tagline}</span>
      <span className="menu-footer__rights">{menuStrings.footer.rights(year, restaurantName)}</span>
    </footer>
  )
}

export default MenuFooter
