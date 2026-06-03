import type { AdminCategory, AdminMenuItem } from "../types"

type DishListProps = {
  items: AdminMenuItem[]
  categories: AdminCategory[]
}

const UNCATEGORIZED = "__none__"

function DishList({ items, categories }: DishListProps) {
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
            <ul className="menu-admin__list">
              {list.map((item) => (
                <li key={item.public_id} className="menu-admin__row">
                  <span className="menu-admin__row-name">{item.name}</span>
                  <span className="menu-admin__dish-price">{Number(item.price).toFixed(2)}</span>
                  <span
                    className={`menu-admin__dish-status${
                      item.is_available ? "" : " menu-admin__dish-status--off"
                    }`}
                  >
                    {item.is_available ? "Available" : "Hidden"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}

export default DishList
