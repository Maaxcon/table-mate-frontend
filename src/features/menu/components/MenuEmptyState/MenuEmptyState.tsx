import "./MenuEmptyState.css"

type MenuEmptyStateProps = {
  message?: string
}

function MenuEmptyState({ message = "No items found." }: MenuEmptyStateProps) {
  return (
    <div className="menu-empty">
      <p className="menu-empty__text">{message}</p>
    </div>
  )
}

export default MenuEmptyState
