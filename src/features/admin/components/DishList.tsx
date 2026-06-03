import type { AdminCategory, AdminMenuItem } from "../types"

type DishListProps = {
  items: AdminMenuItem[]
  categories: AdminCategory[]
  onEdit: (item: AdminMenuItem) => void
}

const UNCATEGORIZED = "__none__"

function DishList({ items, categories, onEdit }: DishListProps) {
  const categoryName = new Map(categories.map((c) => [c.public_id, c.name]))

  // Group items by category, keeping category order, with uncategorized last.
  const groups = new Map<string, AdminMenuItem[]>()
  for (const c of categories) groups.set(c.public_id, [])
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return (
    <div className="menu-admin__dishes">
      {[...groups.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([key, list]) => (
          <div key={key} className="menu-admin__group">
            <h3 className="menu-admin__group-title">
              {key === UNCATEGORIZED ? "Uncategorized" : (categoryName.get(key) ?? "—")}
            </h3>
            <ul className="menu-admin__dish-grid">
              {list.map((item) => (
                <li key={item.public_id}>
                  <button
                    type="button"
                    className="menu-admin__dish-card"
                    onClick={() => onEdit(item)}
                  >
                    {item.image ? (
                      <img className="menu-admin__dish-img" src={item.image} alt="" />
                    ) : (
                      <span className="menu-admin__dish-img menu-admin__dish-img--empty">
                        No photo
                      </span>
                    )}
                    <span className="menu-admin__dish-body">
                      <span className="menu-admin__dish-name">{item.name}</span>
                      <span className="menu-admin__dish-meta">
                        <span className="menu-admin__dish-price">
                          {Number(item.price).toFixed(2)}
                        </span>
                        <span
                          className={`menu-admin__dish-status${
                            item.is_available ? "" : " menu-admin__dish-status--off"
                          }`}
                        >
                          {item.is_available ? "Available" : "Hidden"}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}

export default DishList
