import AdminSectionForm from "@/features/admin/components/AdminSectionForm"
import TextField from "@/features/admin/components/TextField"
import RestaurantCover from "@/features/admin/components/RestaurantCover"
import WorkingHoursEditor from "@/features/admin/components/WorkingHoursEditor"
import { hasInvalidWorkingHours } from "@/features/admin/constants/workingHours"
import { useAdminResource } from "@/features/admin/hooks/useAdminResource"
import type { AdminRestaurant } from "@/features/admin/types"

function RestaurantSection() {
  const { form, loading, loadError, status, saveError, dirty, setField, submit } =
    useAdminResource<AdminRestaurant>("/api/restaurants/restaurants/")

  const hoursInvalid = form ? hasInvalidWorkingHours(form.working_hours ?? {}) : false

  return (
    <AdminSectionForm
      title="Restaurant"
      description="Edit your restaurant name, address, contact links, and hours."
      loading={loading}
      loadError={loadError}
      status={status}
      saveError={saveError}
      dirty={dirty}
      saveDisabled={hoursInvalid}
      onSubmit={() => void submit()}
    >
      {form && (
        <>
          <RestaurantCover restaurantId={form.public_id} initialCover={form.cover_image ?? null} />
          <TextField label="Name" value={form.name} onChange={(v) => setField("name", v)} />
          <TextField
            label="Address"
            value={form.address}
            onChange={(v) => setField("address", v)}
          />
          <TextField
            label="Phone"
            type="tel"
            value={form.phone ?? ""}
            onChange={(v) => setField("phone", v)}
            placeholder="+380..."
          />
          <TextField
            label="Telegram"
            type="url"
            value={form.telegram_url ?? ""}
            onChange={(v) => setField("telegram_url", v)}
            placeholder="https://t.me/..."
          />
          <TextField
            label="Facebook"
            type="url"
            value={form.facebook_url ?? ""}
            onChange={(v) => setField("facebook_url", v)}
            placeholder="https://facebook.com/..."
          />
          <WorkingHoursEditor
            value={form.working_hours ?? {}}
            onChange={(wh) => setField("working_hours", wh)}
          />
        </>
      )}
    </AdminSectionForm>
  )
}

export default RestaurantSection
