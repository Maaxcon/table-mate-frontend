import { useState } from "react"
import Modal from "@/features/admin/components/Modal"
import TextField from "@/features/admin/components/TextField"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
import type {
  AdminAllergen,
  AdminCategoryWithTranslations,
  AdminIngredient,
  AdminMenuItemWithTranslations,
  AdminMenuWithTranslations,
  AdminRestaurantWithTranslations,
  AdminTableWithTranslations,
  AdminZoneWithTranslations,
  AllergenTranslation,
  IngredientTranslation,
  MenuCategoryTranslation,
  MenuItemTranslation,
  MenuTranslation,
  RestaurantTranslation,
  TableTranslation,
  ZoneTranslation,
} from "@/features/admin/types"
import {
  createMenuTranslation,
  updateMenuTranslation,
  deleteMenuTranslation,
  createCategoryTranslation,
  updateCategoryTranslation,
  deleteCategoryTranslation,
  createItemTranslation,
  updateItemTranslation,
  deleteItemTranslation,
  createAllergenTranslation,
  updateAllergenTranslation,
  deleteAllergenTranslation,
  createIngredientTranslation,
  updateIngredientTranslation,
  deleteIngredientTranslation,
  createRestaurantTranslation,
  updateRestaurantTranslation,
  deleteRestaurantTranslation,
  createZoneTranslation,
  updateZoneTranslation,
  deleteZoneTranslation,
  createTableTranslation,
  updateTableTranslation,
  deleteTableTranslation,
} from "@/features/admin/api/menu"

type EntityType =
  | "menu"
  | "category"
  | "item"
  | "allergen"
  | "ingredient"
  | "restaurant"
  | "zone"
  | "table"

type Entity =
  | AdminMenuWithTranslations
  | AdminCategoryWithTranslations
  | AdminMenuItemWithTranslations
  | AdminAllergen
  | AdminIngredient
  | AdminRestaurantWithTranslations
  | AdminZoneWithTranslations
  | AdminTableWithTranslations

type TranslationEditModalProps = {
  entityType: EntityType
  entity: Entity
  languageCode: string
  languageName: string
  primaryLanguage: string
  existingTranslation:
    | MenuTranslation
    | MenuCategoryTranslation
    | MenuItemTranslation
    | AllergenTranslation
    | IngredientTranslation
    | RestaurantTranslation
    | ZoneTranslation
    | TableTranslation
    | null
  onClose: () => void
  onSaved: () => void
}

const LANGUAGE_NAMES: Record<string, string> = {
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

function getPrimaryValue(entity: Entity, field: string): string {
  if ("name" in entity && field === "name")
    return ((entity as Record<string, unknown>).name as string) ?? ""
  if ("description" in entity && field === "description")
    return ((entity as Record<string, unknown>).description as string) ?? ""
  if ("address" in entity && field === "address")
    return ((entity as Record<string, unknown>).address as string) ?? ""
  if ("public_number" in entity && field === "public_number")
    return ((entity as Record<string, unknown>).public_number as string) ?? ""
  return ""
}

function getTranslateFields(entityType: EntityType): string[] {
  switch (entityType) {
    case "menu":
    case "category":
    case "allergen":
    case "ingredient":
    case "zone":
      return ["name"]
    case "item":
      return ["name", "description"]
    case "restaurant":
      return ["address"]
    case "table":
      return ["public_number"]
    default:
      return ["name"]
  }
}

function TranslationEditModal({
  entityType,
  entity,
  languageCode,
  languageName,
  primaryLanguage,
  existingTranslation,
  onClose,
  onSaved,
}: TranslationEditModalProps) {
  const strings = useAdminStrings()
  const toast = useToast()
  const translateFields = getTranslateFields(entityType)
  const isNew = !existingTranslation

  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of translateFields) {
      initial[field] = existingTranslation
        ? (((existingTranslation as Record<string, unknown>)[field] as string) ?? "")
        : ""
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (entityType === "item") {
        payload.description ??= ""
      }

      const publicId = (entity as Record<string, unknown>).public_id as string

      if (entityType === "menu") {
        if (isNew) {
          await createMenuTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
          })
        } else {
          await updateMenuTranslation(publicId, languageCode, { name: form.name })
        }
      } else if (entityType === "category") {
        if (isNew) {
          await createCategoryTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
          })
        } else {
          await updateCategoryTranslation(publicId, languageCode, { name: form.name })
        }
      } else if (entityType === "item") {
        if (isNew) {
          await createItemTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
            description: form.description ?? null,
          })
        } else {
          await updateItemTranslation(publicId, languageCode, {
            name: form.name,
            description: form.description ?? null,
          })
        }
      } else if (entityType === "allergen") {
        if (isNew) {
          await createAllergenTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
          })
        } else {
          await updateAllergenTranslation(publicId, languageCode, { name: form.name })
        }
      } else if (entityType === "ingredient") {
        if (isNew) {
          await createIngredientTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
          })
        } else {
          await updateIngredientTranslation(publicId, languageCode, { name: form.name })
        }
      } else if (entityType === "restaurant") {
        if (isNew) {
          await createRestaurantTranslation(publicId, {
            language_code: languageCode,
            address: form.address,
          })
        } else {
          await updateRestaurantTranslation(publicId, languageCode, { address: form.address })
        }
      } else if (entityType === "zone") {
        if (isNew) {
          await createZoneTranslation(publicId, {
            language_code: languageCode,
            name: form.name,
          })
        } else {
          await updateZoneTranslation(publicId, languageCode, { name: form.name })
        }
      } else if (entityType === "table") {
        if (isNew) {
          await createTableTranslation(publicId, {
            language_code: languageCode,
            public_number: form.public_number,
          })
        } else {
          await updateTableTranslation(publicId, languageCode, {
            public_number: form.public_number,
          })
        }
      }

      toast.success(isNew ? "Translation added" : "Translation saved")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save translation.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      const publicId = (entity as Record<string, unknown>).public_id as string

      if (entityType === "menu") await deleteMenuTranslation(publicId, languageCode)
      else if (entityType === "category") await deleteCategoryTranslation(publicId, languageCode)
      else if (entityType === "item") await deleteItemTranslation(publicId, languageCode)
      else if (entityType === "allergen") await deleteAllergenTranslation(publicId, languageCode)
      else if (entityType === "ingredient")
        await deleteIngredientTranslation(publicId, languageCode)
      else if (entityType === "restaurant")
        await deleteRestaurantTranslation(publicId, languageCode)
      else if (entityType === "zone") await deleteZoneTranslation(publicId, languageCode)
      else if (entityType === "table") await deleteTableTranslation(publicId, languageCode)

      toast.success("Translation deleted")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete translation.")
    } finally {
      setSubmitting(false)
    }
  }

  const primaryLanguageName = LANGUAGE_NAMES[primaryLanguage] ?? primaryLanguage

  return (
    <Modal
      title={`${isNew ? "Add" : "Edit"} ${languageName} translation`}
      onClose={onClose}
      closeDisabled={submitting}
      className="admin-modal--translation"
    >
      <div className="translation-modal__body">
        <div className="translation-modal__reference">
          <h3 className="translation-modal__column-title">{primaryLanguageName} (original)</h3>
          <div className="translation-modal__reference-fields">
            {translateFields.map((field) => (
              <div key={field} className="translation-modal__field">
                <label className="translation-modal__field-label">{field}</label>
                <div className="translation-modal__reference-value">
                  {getPrimaryValue(entity, field)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="translation-modal__editor">
          <h3 className="translation-modal__column-title">{languageName}</h3>
          <div className="translation-modal__editor-fields">
            {translateFields.map((field) =>
              field === "description" ? (
                <label key={field} className="admin-field">
                  <span className="admin-field__label">{field}</span>
                  <textarea
                    className="admin-field__input"
                    value={form[field] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    rows={4}
                  />
                </label>
              ) : (
                <TextField
                  key={field}
                  label={field}
                  value={form[field] ?? ""}
                  onChange={(v: string) => setForm((prev) => ({ ...prev, [field]: v }))}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="translation-modal__actions">
        {!isNew && (
          <button
            type="button"
            className="admin-form__delete"
            onClick={handleDelete}
            disabled={submitting}
          >
            Delete translation
          </button>
        )}
        <div className="translation-modal__actions-right">
          <button
            type="button"
            className="admin-form__cancel"
            onClick={onClose}
            disabled={submitting}
          >
            {strings.common.cancel}
          </button>
          <button
            type="button"
            className="admin-form__save"
            onClick={handleSave}
            disabled={submitting || !form[translateFields[0]]?.trim()}
          >
            {submitting ? strings.common.saving : isNew ? strings.common.add : strings.common.save}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default TranslationEditModal
