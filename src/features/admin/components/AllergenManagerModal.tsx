import { useEffect, useState } from "react"
import { LuTrash2 } from "react-icons/lu"
import {
  createAllergen,
  deleteAllergen,
  fetchAdminAllergens,
  type AdminAllergen,
} from "@/features/admin/api/menu"
import ConfirmDialog from "@/features/admin/components/ConfirmDialog"
import Modal from "@/features/admin/components/Modal"
import { useAdminStrings } from "@/features/admin/strings"
import "@/features/admin/components/styles/adminForm.css"

type AllergenManagerModalProps = {
  onClose: () => void
  onDeleted: () => void
}

function AllergenManagerModal({ onClose, onDeleted }: AllergenManagerModalProps) {
  const strings = useAdminStrings()
  const [allergens, setAllergens] = useState<AdminAllergen[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState<AdminAllergen | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminAllergens(controller.signal)
      .then(setAllergens)
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message || strings.menu.allergens.loadError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [strings.menu.allergens.loadError])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    setSubmitting(true)
    setError(null)
    try {
      const allergen = await createAllergen(trimmedName)
      setAllergens((current) => [...current, allergen].sort((a, b) => a.name.localeCompare(b.name)))
      setName("")
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.allergens.addError)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirming) return
    setDeleting(true)
    setError(null)
    try {
      await deleteAllergen(confirming.public_id)
      setAllergens((current) =>
        current.filter((allergen) => allergen.public_id !== confirming.public_id),
      )
      onDeleted()
      setConfirming(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.allergens.deleteError)
      setConfirming(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal title={strings.menu.allergens.manageTitle} onClose={onClose} active={!confirming}>
        <div className="allergen-manager">
          <p className="allergen-manager__description">
            {strings.menu.allergens.manageDescription}
          </p>
          <form className="admin-form allergen-manager__form" onSubmit={handleSubmit}>
            <input
              className="admin-field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={strings.menu.allergens.newPlaceholder}
            />
            <button
              type="submit"
              className="admin-form__save"
              disabled={submitting || !name.trim()}
            >
              {submitting ? strings.menu.allergens.adding : strings.menu.allergens.add}
            </button>
          </form>
          {error && <p className="admin-form__status admin-form__status--error">{error}</p>}
          {loading ? (
            <p className="admin-section__description">{strings.common.loading}</p>
          ) : (
            <ul className="allergen-manager__list">
              {allergens.map((allergen) => (
                <li key={allergen.public_id} className="allergen-manager__item">
                  <span>{allergen.name}</span>
                  <button
                    type="button"
                    className="allergen-manager__delete"
                    onClick={() => setConfirming(allergen)}
                    aria-label={strings.menu.allergens.deleteAria(allergen.name)}
                  >
                    <LuTrash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
      {confirming && (
        <ConfirmDialog
          title={strings.menu.allergens.confirmDelete.title}
          message={strings.menu.allergens.confirmDelete.message(confirming.name)}
          confirmLabel={strings.menu.allergens.confirmDelete.confirm}
          tone="danger"
          busy={deleting}
          onConfirm={() => void handleDelete()}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  )
}

export default AllergenManagerModal
