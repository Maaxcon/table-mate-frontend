import type { SelectOption } from "./SelectField"

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

export const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: "Europe/Kyiv", label: "Europe/Kyiv" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "UTC", label: "UTC" },
]
