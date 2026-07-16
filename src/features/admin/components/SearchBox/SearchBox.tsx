import { LuSearch } from "react-icons/lu"
import { useAdminStrings } from "@/features/admin/strings"
import "./search.css"

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

function SearchBox({ value, onChange, placeholder, ariaLabel }: SearchBoxProps) {
  const strings = useAdminStrings()
  const effectivePlaceholder = placeholder ?? strings.common.search
  const effectiveAria = ariaLabel ?? strings.common.search
  return (
    <div className="admin-search">
      <LuSearch className="admin-search__icon" aria-hidden="true" />
      <input
        className="admin-search__input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={effectivePlaceholder}
        aria-label={effectiveAria}
      />
    </div>
  )
}

export default SearchBox
