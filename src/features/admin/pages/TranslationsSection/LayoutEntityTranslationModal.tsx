import { useState } from "react"
import Modal from "@/features/admin/components/Modal"
import TextField from "@/features/admin/components/TextField"
import * as layoutApi from "@/features/admin/api/layout"
import { useToast } from "@/features/admin/hooks/toastContext"
import { useAdminStrings } from "@/features/admin/strings"
import { LANGUAGE_NAMES } from "@/features/admin/constants/settingsOptions"
import type { AdminLayoutEntity, LayoutEntityTranslation } from "@/features/admin/types"

export type LayoutEntityTranslationModalProps = {
  entity: AdminLayoutEntity
  primaryLanguage: string
  displayLanguages: string[]
  onClose: () => void
  /** Called after a successful save with the entity's final translations. */
  onSaved: (entityId: string, translations: LayoutEntityTranslation[]) => void
  /** Called on failure (e.g. 409 conflict) so the parent can refetch and resync. */
  onRefresh: (entityId: string) => Promise<void>
}

function isConflict(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("CONFLICT:")
}

function LayoutEntityTranslationModal({
  entity,
  primaryLanguage,
  displayLanguages,
  onClose,
  onSaved,
  onRefresh,
}: LayoutEntityTranslationModalProps) {
  const strings = useAdminStrings()
  const toast = useToast()
  const isTable = entity.type.startsWith("table")

  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const code of displayLanguages) {
      initial[code] = entity.translations.find((t) => t.language_code === code)?.label ?? ""
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)

  const hasChanges = displayLanguages.some((code) => {
    const previous = entity.translations.find((t) => t.language_code === code)?.label ?? ""
    return (form[code] ?? "") !== previous
  })

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const next: LayoutEntityTranslation[] = []
      for (const code of displayLanguages) {
        const value = (form[code] ?? "").trim()
        const existing = entity.translations.find((t) => t.language_code === code)
        if (!value) {
          if (existing) {
            if (isTable) {
              await layoutApi.deleteTableTranslation(entity.id, code)
            } else {
              await layoutApi.deleteEntityTranslation(entity.id, code)
            }
          }
        } else if (existing) {
          if (existing.label !== value) {
            if (isTable) {
              await layoutApi.updateTableTranslation(entity.id, code, {
                current: { public_number: existing.label },
                updated: { public_number: value },
              })
            } else {
              await layoutApi.updateEntityTranslation(entity.id, code, {
                current: { label: existing.label },
                updated: { label: value },
              })
            }
          }
          next.push({ entity_id: entity.id, language_code: code, label: value })
        } else {
          if (isTable) {
            await layoutApi.createTableTranslation(entity.id, {
              language_code: code,
              public_number: value,
            })
          } else {
            await layoutApi.createEntityTranslation({
              entity_id: entity.id,
              language_code: code,
              label: value,
            })
          }
          next.push({ entity_id: entity.id, language_code: code, label: value })
        }
      }
      onSaved(entity.id, next)
      toast.success(strings.translations.layout.toasts.saved)
      onClose()
    } catch (err) {
      await onRefresh(entity.id)
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : strings.translations.layout.toasts.saveFailed,
      )
      if (!isConflict(err)) {
        throw err
      }
    } finally {
      setSubmitting(false)
    }
  }

  const primaryLanguageName = LANGUAGE_NAMES[primaryLanguage] ?? primaryLanguage

  return (
    <Modal
      title={strings.translations.layout.modal.title(entity.label || entity.id)}
      onClose={onClose}
      closeDisabled={submitting}
      className="admin-modal--translation"
    >
      <div className="layout-translations-modal__body">
        <div className="translation-modal__reference">
          <h3 className="translation-modal__column-title">
            {strings.translations.modal.original(primaryLanguageName)}
          </h3>
          <div className="translation-modal__reference-value">{entity.label || "—"}</div>
        </div>
        <div className="translation-modal__editor">
          <h3 className="translation-modal__column-title">
            {strings.translations.layout.modal.languages}
          </h3>
          <div className="translation-modal__editor-fields">
            {displayLanguages.map((code) => (
              <TextField
                key={code}
                label={LANGUAGE_NAMES[code] ?? code}
                value={form[code] ?? ""}
                onChange={(v: string) => setForm((prev) => ({ ...prev, [code]: v }))}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="translation-modal__actions">
        <span className="layout-translations-modal__hint">
          {strings.translations.layout.modal.clearHint}
        </span>
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
            disabled={submitting || !hasChanges}
          >
            {submitting ? strings.common.saving : strings.common.save}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default LayoutEntityTranslationModal
