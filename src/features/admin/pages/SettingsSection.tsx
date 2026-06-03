import { LuSettings } from "react-icons/lu"
import SectionPlaceholder from "../components/SectionPlaceholder"

function SettingsSection() {
  return (
    <SectionPlaceholder
      title="Settings"
      description="Tax rate, service charge, currency, locale, and timezone."
      icon={<LuSettings aria-hidden="true" />}
    />
  )
}

export default SettingsSection
