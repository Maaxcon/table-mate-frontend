import "@/features/admin/components/styles/adminForm.css"
import AdminSectionForm from "@/features/admin/components/AdminSectionForm"
import TextField from "@/features/admin/components/TextField"
import SelectField from "@/features/admin/components/SelectField"
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  SUPPORTED_LANGUAGES_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/features/admin/constants/settingsOptions"
import { formatCurrency } from "@/features/menu/utils"
import { useAdminResource } from "@/features/admin/hooks/useAdminResource"
import type { AdminSettings } from "@/features/admin/types"
import { useAdminStrings } from "@/features/admin/strings"

type RateErrorCopy = {
  required: string
  number: string
  range: string
}

function rateError(value: string, copy: RateErrorCopy): string | undefined {
  const v = value.trim()
  if (!v) return copy.required
  const n = Number(v)
  if (!Number.isFinite(n)) return copy.number
  if (n < 0 || n > 1) return copy.range
  return undefined
}

function toggleLanguage(code: string, current: string[] | undefined): string[] {
  const set = new Set(current ?? [])
  if (set.has(code)) {
    set.delete(code)
  } else {
    set.add(code)
  }
  return Array.from(set).sort()
}

function SettingsSection() {
  const { form, loading, loadError, status, saveError, dirty, setField, submit } =
    useAdminResource<AdminSettings>("/api/restaurants/restaurant-settings/")
  const strings = useAdminStrings()
  const rateCopy = strings.settings.rateErrors

  const taxError = form ? rateError(form.default_tax_rate ?? "", rateCopy) : undefined
  const serviceError = form ? rateError(form.default_service_charge ?? "", rateCopy) : undefined

  return (
    <AdminSectionForm
      title={strings.settings.title}
      description={strings.settings.description}
      loading={loading}
      loadError={loadError}
      status={status}
      saveError={saveError}
      dirty={dirty}
      saveDisabled={taxError != null || serviceError != null}
      onSubmit={() => void submit()}
    >
      {form && (
        <>
          <div className="admin-form__row">
            <TextField
              label={strings.settings.fields.tax.label}
              type="number"
              inputMode="decimal"
              step="0.0001"
              value={form.default_tax_rate ?? ""}
              onChange={(v) => setField("default_tax_rate", v)}
              hint={strings.settings.fields.tax.hint}
              error={taxError}
            />
            <TextField
              label={strings.settings.fields.service.label}
              type="number"
              inputMode="decimal"
              step="0.0001"
              value={form.default_service_charge ?? ""}
              onChange={(v) => setField("default_service_charge", v)}
              hint={strings.settings.fields.service.hint}
              error={serviceError}
            />
          </div>
          <div className="admin-form__row">
            <SelectField
              label={strings.settings.fields.currency.label}
              value={form.currency}
              onChange={(v) => setField("currency", v)}
              options={CURRENCY_OPTIONS}
              hint={strings.settings.fields.currency.hint(
                formatCurrency(180, form.currency, form.locale ?? ""),
              )}
            />
            <SelectField
              label={strings.settings.fields.locale.label}
              value={form.locale ?? ""}
              onChange={(v) => setField("locale", v)}
              options={LOCALE_OPTIONS}
            />
          </div>
          <SelectField
            label={strings.settings.fields.timezone.label}
            value={form.timezone ?? ""}
            onChange={(v) => setField("timezone", v)}
            options={TIMEZONE_OPTIONS}
          />
          <label className="admin-field">
            <span className="admin-field__label">
              {strings.settings.fields.supportedLanguages.label}
            </span>
            <div className="admin-lang-grid">
              {SUPPORTED_LANGUAGES_OPTIONS.map((lang) => {
                const checked = (form.supported_languages ?? []).includes(lang.value)
                const isLocale = lang.value === form.locale
                return (
                  <label key={lang.value} className="admin-field admin-field--check">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLocale}
                      onChange={() => {
                        if (isLocale) return
                        setField(
                          "supported_languages",
                          toggleLanguage(lang.value, form.supported_languages),
                        )
                      }}
                    />
                    <span className="admin-field__label">{lang.label}</span>
                  </label>
                )
              })}
            </div>
            <span className="admin-field__hint">
              {strings.settings.fields.supportedLanguages.hint}
            </span>
          </label>
        </>
      )}
    </AdminSectionForm>
  )
}

export default SettingsSection
