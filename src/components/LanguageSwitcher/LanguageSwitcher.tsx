import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { api } from "@/api/client"
import { LANGUAGE_NAMES } from "@/features/admin/constants/settingsOptions"
import "./LanguageSwitcher.css"

const FALLBACK_LANGUAGES = ["en", "uk"] as const

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [languages, setLanguages] = useState<string[]>([...FALLBACK_LANGUAGES])

  useEffect(() => {
    const controller = new AbortController()
    api
      .getList<{ supported_languages: string[] }>("/api/restaurants/restaurant-settings/", {
        signal: controller.signal,
      })
      .then((list) => {
        const langs = list[0]?.supported_languages
        if (langs && langs.length > 0) {
          setLanguages(langs)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value)
  }

  return (
    <select
      className={["language-switcher", className].filter(Boolean).join(" ")}
      value={i18n.language}
      onChange={handleChange}
      aria-label="Select language"
    >
      {languages.map((code) => (
        <option key={code} value={code}>
          {LANGUAGE_NAMES[code] ?? code.toUpperCase()}
        </option>
      ))}
    </select>
  )
}
