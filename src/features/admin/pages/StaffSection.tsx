import { LuUsers } from "react-icons/lu"
import SectionPlaceholder from "../components/SectionPlaceholder"

function StaffSection() {
  return (
    <SectionPlaceholder
      title="Staff"
      description="Manage employees — change roles and enable or disable access."
      icon={<LuUsers aria-hidden="true" />}
    />
  )
}

export default StaffSection
