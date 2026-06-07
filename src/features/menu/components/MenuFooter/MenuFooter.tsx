import { FaTelegram, FaFacebook } from "react-icons/fa"
import { menuStrings } from "../../strings"

type MenuFooterProps = {
  telegramUrl: string
  facebookUrl: string
}

/** Social links footer; renders nothing when no links are set. */
function MenuFooter({ telegramUrl, facebookUrl }: MenuFooterProps) {
  if (!telegramUrl && !facebookUrl) return null
  return (
    <footer className="menu-page__footer">
      <span className="menu-page__footer-label">{menuStrings.footer.social}</span>
      <div className="menu-page__footer-links">
        {telegramUrl && (
          <a
            className="menu-page__footer-link menu-page__footer-link--telegram"
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
          >
            <FaTelegram size={20} />
            <span>Telegram</span>
          </a>
        )}
        {facebookUrl && (
          <a
            className="menu-page__footer-link menu-page__footer-link--facebook"
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <FaFacebook size={20} />
            <span>Facebook</span>
          </a>
        )}
      </div>
    </footer>
  )
}

export default MenuFooter
