import type { ReactElement } from "react"
import {
  LuBeef,
  LuBeer,
  LuCakeSlice,
  LuChefHat,
  LuCoffee,
  LuCupSoda,
  LuFish,
  LuFlame,
  LuGlassWater,
  LuLayoutGrid,
  LuPizza,
  LuSalad,
  LuSandwich,
  LuSoup,
  LuUtensilsCrossed,
  LuUtensils,
  LuWheat,
  LuWine,
} from "react-icons/lu"
import type { MenuCategory } from "@/features/menu/types"
import "./CategoryRail.css"

function getCategoryIcon(name: string): ReactElement {
  const n = name.toLowerCase()
  if (n.includes("салат")) return <LuSalad size={14} />
  if (n.includes("суп") || n.includes("борщ") || n.includes("крем-суп")) return <LuSoup size={14} />
  if (n.includes("піц")) return <LuPizza size={14} />
  if (n.includes("паст") || n.includes("равіол") || n.includes("лазань"))
    return <LuUtensilsCrossed size={14} />
  if (n.includes("риб") || n.includes("морепрод") || n.includes("креветк") || n.includes("мідії"))
    return <LuFish size={14} />
  if (n.includes("вино") || n.includes("wine")) return <LuWine size={14} />
  if (n.includes("коктейл")) return <LuGlassWater size={14} />
  if (n.includes("кав") || n.includes("чай") || n.includes("coffee")) return <LuCoffee size={14} />
  if (n.includes("напій") || n.includes("напо") || n.includes("drink"))
    return <LuCupSoda size={14} />
  if (n.includes("десерт") || n.includes("торт") || n.includes("морозив") || n.includes("випічк"))
    return <LuCakeSlice size={14} />
  if (n.includes("закуск")) return <LuSandwich size={14} />
  if (n.includes("гарнір")) return <LuWheat size={14} />
  if (n.includes("гриль") || n.includes("шашлик") || n.includes("барбек"))
    return <LuFlame size={14} />
  if (n.includes("м'яс") || n.includes("стейк") || n.includes("відбивн") || n.includes("ялович"))
    return <LuBeef size={14} />
  if (n.includes("пиво") || n.includes("beer")) return <LuBeer size={14} />
  if (n.includes("основн") || n.includes("страв") || n.includes("гаряч"))
    return <LuUtensils size={14} />
  return <LuChefHat size={14} />
}

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
        <LuLayoutGrid size={14} />
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.public_id}
          className={`category-rail__btn${activeCategory === cat.public_id ? " category-rail__btn--active" : ""}`}
          onClick={() => onSelect(cat.public_id)}
        >
          {getCategoryIcon(cat.name)}
          {cat.name}
        </button>
      ))}
    </div>
  )
}

export default CategoryRail
