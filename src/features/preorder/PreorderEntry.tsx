import { LuCircleCheck, LuFlame, LuUtensilsCrossed } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { getPreorderChipStatus, type PreorderChipStatus } from "@/utils/preorderStatus"
import { formatMoney } from "@/features/cabinet/utils"
import { usePreorderStrings } from "./strings"
import type { PreorderBooking } from "./types"

type PreorderEntryProps = {
  booking: PreorderBooking
  // Both booking lists style their own buttons; the shared part is what the
  // button says and does. Modifiers are derived from this base class, so each
  // list keeps its own look: `${className}--cooking`, `--ready`, `--add`.
  className: string
  onOpen: () => void
  // Lets a list hide the entry after cancelling a pre-order without waiting
  // for the booking to be re-fetched.
  hasPreorder?: boolean
  disabled?: boolean
}

const ICONS: Record<PreorderChipStatus, React.ReactElement> = {
  paid: <LuUtensilsCrossed aria-hidden="true" />,
  cooking: <LuFlame aria-hidden="true" />,
  ready: <LuCircleCheck aria-hidden="true" />,
}

export function PreorderEntry({
  booking,
  className,
  onOpen,
  hasPreorder,
  disabled,
}: PreorderEntryProps) {
  const strings = usePreorderStrings()
  const navigate = useNavigate()

  const shows = hasPreorder ?? booking.has_preorder ?? false

  if (shows) {
    const status = getPreorderChipStatus(booking)
    const labels: Record<PreorderChipStatus, string> = {
      paid: strings.view,
      cooking: strings.cooking,
      ready: strings.ready,
    }
    const note = [
      booking.preorder_items_count ? strings.dishes(booking.preorder_items_count) : null,
      booking.preorder_total && booking.preorder_currency
        ? formatMoney(Number(booking.preorder_total), booking.preorder_currency)
        : null,
    ]
      .filter(Boolean)
      .join(" · ")

    return (
      <button
        type="button"
        className={`${className} ${className}--${status}`}
        onClick={onOpen}
        disabled={disabled}
      >
        {ICONS[status]}
        {labels[status]}
        {note && <span className={`${className}-note`}>&middot; {note}</span>}
      </button>
    )
  }

  if (!booking.can_preorder || !booking.restaurant) return null

  return (
    <button
      type="button"
      className={`${className} ${className}--add`}
      onClick={() => navigate(`/menu/${booking.restaurant}?reservation=${booking.public_id}`)}
      disabled={disabled}
    >
      <LuUtensilsCrossed aria-hidden="true" />
      {strings.add}
    </button>
  )
}
