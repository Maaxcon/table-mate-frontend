import type { SelectOption } from "@/features/admin/components/SelectField"

// Short, fixed lists tuned for a Ukraine-based restaurant.
// SelectField still shows a saved value even if it is outside these lists.

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "UAH", label: "UAH — Ukrainian Hryvnia" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "PLN", label: "PLN — Polish Złoty" },
  { value: "GBP", label: "GBP — British Pound" },
]

export const LOCALE_OPTIONS: SelectOption[] = [
  { value: "uk", label: "Ukrainian (uk)" },
  { value: "en", label: "English (en)" },
  { value: "pl", label: "Polish (pl)" },
  { value: "de", label: "German (de)" },
  { value: "fr", label: "French (fr)" },
]

export const SUPPORTED_LANGUAGES_OPTIONS: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "pl", label: "Polski" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" },
  { value: "ro", label: "Română" },
  { value: "bg", label: "Български" },
  { value: "cs", label: "Čeština" },
  { value: "da", label: "Dansk" },
  { value: "el", label: "Ελληνικά" },
  { value: "et", label: "Eesti" },
  { value: "fi", label: "Suomi" },
  { value: "hu", label: "Magyar" },
  { value: "lt", label: "Lietuvių" },
  { value: "lv", label: "Latviešu" },
  { value: "sk", label: "Slovenčina" },
  { value: "sl", label: "Slovenščina" },
  { value: "sv", label: "Svenska" },
  { value: "tr", label: "Türkçe" },
]

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  pl: "Polski",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ro: "Română",
  bg: "Български",
  cs: "Čeština",
  da: "Dansk",
  el: "Ελληνικά",
  et: "Eesti",
  fi: "Suomi",
  hu: "Magyar",
  lt: "Lietuvių",
  lv: "Latviešu",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sv: "Svenska",
  tr: "Türkçe",
}

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: "Europe/Kyiv", label: "Europe/Kyiv" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "UTC", label: "UTC" },
]
