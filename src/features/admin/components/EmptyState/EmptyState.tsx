import { LuPlus } from "react-icons/lu"
import "../styles/SectionPlaceholder.css"
import "./empty.css"

type EmptyStateProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="admin-section__placeholder">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="admin-empty__btn" onClick={onAction}>
          <LuPlus aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}

export default EmptyState
