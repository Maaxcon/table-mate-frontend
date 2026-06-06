import { useEffect, type FormEvent, type ReactNode } from "react"
import type { SaveStatus } from "../../hooks/useAdminResource"
import { useToast } from "../../hooks/toastContext"
import "../styles/SectionPlaceholder.css"
import "../styles/adminForm.css"

type AdminSectionFormProps = {
  title: string
  description: string
  loading: boolean
  loadError: string | null
  status: SaveStatus
  saveError: string | null
  dirty: boolean
  saveDisabled?: boolean
  onSubmit: () => void
  children: ReactNode
}

function AdminSectionForm({
  title,
  description,
  loading,
  loadError,
  status,
  saveError,
  dirty,
  saveDisabled = false,
  onSubmit,
  children,
}: AdminSectionFormProps) {
  const toast = useToast()

  useEffect(() => {
    if (status === "saved") toast.success("Changes saved")
    else if (status === "error") toast.error(saveError ?? "Could not save changes.")
  }, [status, saveError, toast])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">{title}</h1>
        <p className="admin-section__description">{description}</p>
      </header>

      {loading ? (
        <p className="admin-section__description">Loading…</p>
      ) : loadError ? (
        <p className="admin-form__status admin-form__status--error">{loadError}</p>
      ) : (
        <form className="admin-form" onSubmit={handleSubmit}>
          {children}
          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-form__save"
              disabled={status === "saving" || !dirty || saveDisabled}
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default AdminSectionForm
