import type { MenuCategory } from "@/types/menu"
import "./CategoryRail.css"

type CategoryRailProps = {
  categories: MenuCategory[]
  activeCategory: string | null
  onSelect: (id: string | null) => void
  loading: boolean
}

function CategoryRail({ categories, activeCategory, onSelect, loading }: CategoryRailProps) {
  if (loading) {
    return (
      <div className="category-rail">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="category-rail__skeleton" />
        ))}
      </div>
    )
  }

  return (
    <div className="category-rail">
      <button
        className={`category-rail__btn${activeCategory === null ? " category-rail__btn--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.public_id}
          className={`category-rail__btn${activeCategory === cat.public_id ? " category-rail__btn--active" : ""}`}
          onClick={() => onSelect(cat.public_id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

export default CategoryRail
