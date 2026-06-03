import AdminSectionForm from "../components/AdminSectionForm"
import TextField from "../components/TextField"
import { useAdminResource } from "../hooks/useAdminResource"
import type { AdminSettings } from "../types"

function SettingsSection() {
  const { form, loading, loadError, status, saveError, setField, submit } =
    useAdminResource<AdminSettings>("/api/restaurants/restaurant-settings/")

  return (
    <AdminSectionForm
      title="Settings"
      description="Tax rate, service charge, currency, locale, and timezone."
      loading={loading}
      loadError={loadError}
      status={status}
      saveError={saveError}
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
            <TextField
              label="Currency"
              value={form.currency}
              onChange={(v) => setField("currency", v)}
              placeholder="UAH"
            />
            <TextField
              label="Locale"
              value={form.locale}
              onChange={(v) => setField("locale", v)}
              placeholder="en"
            />
          </div>
          <TextField
            label="Timezone"
            value={form.timezone}
            onChange={(v) => setField("timezone", v)}
            placeholder="UTC"
          />
        </>
      )}
    </AdminSectionForm>
  )
}

export default SettingsSection
