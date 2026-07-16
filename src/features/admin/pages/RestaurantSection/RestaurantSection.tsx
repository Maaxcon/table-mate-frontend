import AdminSectionForm from "@/features/admin/components/AdminSectionForm"
import TextField from "@/features/admin/components/TextField"
import RestaurantCover from "@/features/admin/components/RestaurantCover"
import WorkingHoursEditor from "@/features/admin/components/WorkingHoursEditor"
import { hasInvalidWorkingHours } from "@/features/admin/constants/workingHours"
import { useAdminResource } from "@/features/admin/hooks/useAdminResource"
import type { AdminRestaurant } from "@/features/admin/types"
import { useAdminStrings } from "@/features/admin/strings"

function RestaurantSection() {
  const { form, loading, loadError, status, saveError, dirty, setField, submit } =
    useAdminResource<AdminRestaurant>("/api/restaurants/restaurants/")
  const strings = useAdminStrings()

  const hoursInvalid = form ? hasInvalidWorkingHours(form.working_hours ?? {}) : false

  return (
    <AdminSectionForm
      title={strings.restaurant.title}
      description={strings.restaurant.description}
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
          <TextField
            label={strings.restaurant.fields.name}
            value={form.name}
            onChange={(v) => setField("name", v)}
          />
          <TextField
            label={strings.restaurant.fields.address}
            value={form.address}
            onChange={(v) => setField("address", v)}
          />
          <TextField
            label={strings.restaurant.fields.phone}
            type="tel"
            value={form.phone ?? ""}
            onChange={(v) => setField("phone", v)}
            placeholder={strings.restaurant.fields.phonePlaceholder}
          />
          <TextField
            label={strings.restaurant.fields.telegram}
            type="url"
            value={form.telegram_url ?? ""}
            onChange={(v) => setField("telegram_url", v)}
            placeholder={strings.restaurant.fields.telegramPlaceholder}
          />
          <TextField
            label={strings.restaurant.fields.facebook}
            type="url"
            value={form.facebook_url ?? ""}
            onChange={(v) => setField("facebook_url", v)}
            placeholder={strings.restaurant.fields.facebookPlaceholder}
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
