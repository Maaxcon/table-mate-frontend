import { LuSearch } from "react-icons/lu"
import "./search.css"

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

function SearchBox({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel = "Search",
}: SearchBoxProps) {
  return (
    <div className="admin-search">
      <LuSearch className="admin-search__icon" aria-hidden="true" />
      <input
        className="admin-search__input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  )
}

export default SearchBox
