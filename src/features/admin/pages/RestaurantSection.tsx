import AdminSectionForm from "../components/AdminSectionForm"
import TextField from "../components/TextField"
import { useAdminResource } from "../hooks/useAdminResource"
import type { AdminRestaurant } from "../types"

function RestaurantSection() {
  const { form, loading, loadError, status, saveError, setField, submit } =
    useAdminResource<AdminRestaurant>("/api/restaurants/restaurants/")

  return (
    <AdminSectionForm
      title="Restaurant"
      description="Edit your restaurant name, address, and contact links."
      loading={loading}
      loadError={loadError}
      status={status}
      saveError={saveError}
      onSubmit={() => void submit()}
    >
      {form && (
        <>
          <TextField label="Name" value={form.name} onChange={(v) => setField("name", v)} />
          <TextField
            label="Address"
            value={form.address}
            onChange={(v) => setField("address", v)}
          />
          <TextField
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(v) => setField("phone", v)}
            placeholder="+380..."
          />
          <TextField
            label="Telegram"
            type="url"
            value={form.telegram_url}
            onChange={(v) => setField("telegram_url", v)}
            placeholder="https://t.me/..."
          />
          <TextField
            label="Facebook"
            type="url"
            value={form.facebook_url}
            onChange={(v) => setField("facebook_url", v)}
            placeholder="https://facebook.com/..."
          />
        </>
      )}
    </AdminSectionForm>
  )
}

export default RestaurantSection
