import type { SelectOption } from "./SelectField"

// `Intl.supportedValuesOf` may not be typed in older TS libs — read it defensively.
const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
  .supportedValuesOf

function listOf(key: string, fallback: string[]): string[] {
  try {
    const values = supportedValuesOf?.(key)
    return values && values.length ? values : fallback
  } catch {
    return fallback
  }
}

const currencyNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" })
  } catch {
    return null
  }
})()

export const CURRENCY_OPTIONS: SelectOption[] = listOf("currency", [
  "UAH",
  "USD",
  "EUR",
  "GBP",
  "PLN",
]).map((code) => {
  const name = currencyNames?.of(code)
  return { value: code, label: name && name !== code ? `${code} — ${name}` : code }
})

export const TIMEZONE_OPTIONS: SelectOption[] = listOf("timeZone", [
  "UTC",
  "Europe/Kyiv",
  "Europe/Warsaw",
  "Europe/London",
]).map((tz) => ({ value: tz, label: tz }))

// No clean enumeration for locales — keep a short, common list.
export const LOCALE_OPTIONS: SelectOption[] = [
  { value: "en", label: "English (en)" },
  { value: "uk", label: "Ukrainian (uk)" },
  { value: "pl", label: "Polish (pl)" },
  { value: "de", label: "German (de)" },
  { value: "fr", label: "French (fr)" },
  { value: "es", label: "Spanish (es)" },
  { value: "it", label: "Italian (it)" },
]
