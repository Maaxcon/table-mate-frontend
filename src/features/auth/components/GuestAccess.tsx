import Button from "@/components/Button"
import { authStrings } from "@/features/auth/strings"
import "./GuestAccess.css"

type GuestAccessProps = {
  onContinueAsGuest?: () => void
}

function GuestAccess({ onContinueAsGuest }: GuestAccessProps) {
  return (
    <section className="guest-access">
      <Button className="guest-access__button" onClick={onContinueAsGuest}>
        {authStrings.guest.button}
      </Button>
      <p className="guest-access__note">
        {authStrings.guest.noteLine1}
        <br />
        {authStrings.guest.noteLine2}
      </p>
    </section>
  )
}

export type { GuestAccessProps }
export default GuestAccess
