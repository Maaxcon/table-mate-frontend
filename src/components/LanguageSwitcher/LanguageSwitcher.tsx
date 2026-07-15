import { useTranslation } from "react-i18next"
import "./LanguageSwitcher.css"

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === "uk" ? "en" : "uk"
    i18n.changeLanguage(next)
  }

  return (
    <button
      className={["language-switcher", className].filter(Boolean).join(" ")}
      onClick={toggleLanguage}
      aria-label={`Switch language to ${i18n.language === "uk" ? "English" : "Українська"}`}
      type="button"
    >
      {i18n.language === "uk" ? "EN" : "UA"}
    </button>
  )
}
