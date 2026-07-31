import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend from "i18next-http-backend"
import { setAcceptLanguage } from "@/api/client"
import en from "./locales/en/translation.json"
import uk from "./locales/uk/translation.json"

const ALL_LANGUAGE_CODES = [
  "en",
  "uk",
  "de",
  "fr",
  "pl",
  "es",
  "it",
  "pt",
  "nl",
  "ro",
  "bg",
  "cs",
  "da",
  "el",
  "et",
  "fi",
  "hu",
  "lt",
  "lv",
  "sk",
  "sl",
  "sv",
  "tr",
]

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "uk",
    supportedLngs: ALL_LANGUAGE_CODES,
    load: "currentOnly",
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  })

i18n.on("languageChanged", setAcceptLanguage)
setAcceptLanguage(i18n.language)

export { ALL_LANGUAGE_CODES as SUPPORTED_LANGUAGES }
export default i18n
