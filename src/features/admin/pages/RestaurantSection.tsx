import { LuStore } from "react-icons/lu"
import SectionPlaceholder from "../components/SectionPlaceholder"

function RestaurantSection() {
  return (
    <SectionPlaceholder
      title="Restaurant"
      description="Edit your restaurant name, phone, and social links."
      icon={<LuStore aria-hidden="true" />}
    />
  )
}

export default RestaurantSection
