import AdminSectionForm from "../components/AdminSectionForm"
import TextField from "../components/TextField"
import SelectField from "../components/SelectField"
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, TIMEZONE_OPTIONS } from "../components/settingsOptions"
import { formatCurrency } from "@/features/menu/utils"
import { useAdminResource } from "../hooks/useAdminResource"
import type { AdminSettings } from "../types"

function SettingsSection() {
  const { form, loading, loadError, status, saveError, dirty, setField, submit } =
    useAdminResource<AdminSettings>("/api/restaurants/restaurant-settings/")

  return (
    <AdminSectionForm
      title="Settings"
      description="Tax rate, service charge, currency, locale, and timezone."
      loading={loading}
      loadError={loadError}
      status={status}
      saveError={saveError}
      dirty={dirty}
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
              value={form.default_tax_rate}
              onChange={(v) => setField("default_tax_rate", v)}
              hint="Decimal, e.g. 0.20 = 20%"
            />
            <TextField
              label="Service charge"
              type="number"
              inputMode="decimal"
              step="0.0001"
              value={form.default_service_charge}
              onChange={(v) => setField("default_service_charge", v)}
              hint="Decimal, e.g. 0.10 = 10%"
            />
          </div>
          <div className="admin-form__row">
            <SelectField
              label="Currency"
              value={form.currency}
              onChange={(v) => setField("currency", v)}
              options={CURRENCY_OPTIONS}
              hint={`Prices show as ${formatCurrency(180, form.currency, form.locale)}`}
            />
            <SelectField
              label="Locale"
              value={form.locale}
              onChange={(v) => setField("locale", v)}
              options={LOCALE_OPTIONS}
            />
          </div>
          <SelectField
            label="Timezone"
            value={form.timezone}
            onChange={(v) => setField("timezone", v)}
            options={TIMEZONE_OPTIONS}
          />
        </>
      )}
    </AdminSectionForm>
  )
}

export default SettingsSection
