import Button from "@/components/Button"
import "./GuestAccess.css"

type GuestAccessProps = {
  onContinueAsGuest?: () => void
}

function GuestAccess({ onContinueAsGuest }: GuestAccessProps) {
  return (
    <section className="guest-access">
      <Button className="guest-access__button" onClick={onContinueAsGuest}>
        Continue as Guest
      </Button>
      <p className="guest-access__note">
        Anonymous access to maps and menus.
        <br />
        Registration required for booking.
      </p>
    </section>
  )
}

export type { GuestAccessProps }
export default GuestAccess
