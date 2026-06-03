import { LuUtensilsCrossed } from "react-icons/lu"
import SectionPlaceholder from "../components/SectionPlaceholder"

function MenuSection() {
  return (
    <SectionPlaceholder
      title="Menu"
      description="Add and edit categories and dishes, prices, and photos."
      icon={<LuUtensilsCrossed aria-hidden="true" />}
    />
  )
}

export default MenuSection
