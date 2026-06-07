import type { ReactNode } from "react"
import "@/features/admin/components/styles/SectionPlaceholder.css"

type SectionPlaceholderProps = {
  title: string
  description: string
  icon?: ReactNode
}

/** Temporary content for admin sections until each one is built (M2–M4). */
function SectionPlaceholder({ title, description, icon }: SectionPlaceholderProps) {
  return (
    <section className="admin-section">
      <header className="admin-section__header">
        <h1 className="admin-section__title">{title}</h1>
        <p className="admin-section__description">{description}</p>
      </header>
      <div className="admin-section__placeholder">
        {icon && <div className="admin-section__placeholder-icon">{icon}</div>}
        <p>Coming soon</p>
      </div>
    </section>
  )
}

export default SectionPlaceholder
