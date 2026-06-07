import AdminSectionForm from "@/features/admin/components/AdminSectionForm"
import TextField from "@/features/admin/components/TextField"
import SelectField from "@/features/admin/components/SelectField"
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/features/admin/constants/settingsOptions"
import { formatCurrency } from "@/features/menu/utils"
import { useAdminResource } from "@/features/admin/hooks/useAdminResource"
import type { AdminSettings } from "@/features/admin/types"

// Tax/service are stored as decimals, so they must be a number from 0 to 1.
function rateError(value: string): string | undefined {
  const v = value.trim()
  if (!v) return "Required"
  const n = Number(v)
  if (!Number.isFinite(n)) return "Enter a number"
  if (n < 0 || n > 1) return "Must be between 0 and 1 (e.g. 0.2 = 20%)"
  return undefined
}

function SettingsSection() {
  const { form, loading, loadError, status, saveError, dirty, setField, submit } =
    useAdminResource<AdminSettings>("/api/restaurants/restaurant-settings/")

  const taxError = form ? rateError(form.default_tax_rate ?? "") : undefined
  const serviceError = form ? rateError(form.default_service_charge ?? "") : undefined

  return (
    <AdminSectionForm
      title="Settings"
      description="Tax rate, service charge, currency, locale, and timezone."
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
              label="Tax rate"
              type="number"
              inputMode="decimal"
              step="0.0001"
              value={form.default_tax_rate ?? ""}
              onChange={(v) => setField("default_tax_rate", v)}
              hint="Decimal, e.g. 0.20 = 20%"
              error={taxError}
            />
            <TextField
              label="Service charge"
              type="number"
              inputMode="decimal"
              step="0.0001"
              value={form.default_service_charge ?? ""}
              onChange={(v) => setField("default_service_charge", v)}
              hint="Decimal, e.g. 0.10 = 10%"
              error={serviceError}
            />
          </div>
          <div className="admin-form__row">
            <SelectField
              label="Currency"
              value={form.currency}
              onChange={(v) => setField("currency", v)}
              options={CURRENCY_OPTIONS}
              hint={`Prices show as ${formatCurrency(180, form.currency, form.locale ?? "")}`}
            />
            <SelectField
              label="Locale"
              value={form.locale ?? ""}
              onChange={(v) => setField("locale", v)}
              options={LOCALE_OPTIONS}
            />
          </div>
          <SelectField
            label="Timezone"
            value={form.timezone ?? ""}
            onChange={(v) => setField("timezone", v)}
            options={TIMEZONE_OPTIONS}
          />
        </>
      )}
    </AdminSectionForm>
  )
}

export default SettingsSection
