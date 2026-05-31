import { useNavigate } from "react-router-dom"
import { LuArrowLeft, LuLogOut } from "react-icons/lu"
import { apiFetch } from "@/api/client"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import { BookingsList, HistoryList, ProfileHeader } from "./components"
import { useCabinet } from "./hooks/useCabinet"
import type { HistoryEntry, Reservation } from "./types"
import "./CabinetPage.css"

function CabinetPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile, bookings, history, loading, bookingsError, cancelBooking } = useCabinet()

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" })
    } finally {
      dispatch(clearAuth())
      navigate("/", { replace: true })
    }
  }

  const handleModify = (booking: Reservation) => {
    // TODO(backend): open a reschedule flow once the customer-facing
    // reservation edit screen exists. For now, point at the future route.
    console.info("Modify booking", booking.public_id)
    window.alert("Editing a booking is coming soon.")
  }

  const handleCancel = (booking: Reservation) => {
    const ok = window.confirm("Cancel this booking?")
    if (ok) cancelBooking(booking.public_id)
  }

  const handleOpenReceipt = (entry: HistoryEntry) => {
    // TODO(backend): open the real receipt once order history is wired up.
    console.info("Open receipt", entry.id)
    window.alert("Receipt view is coming soon.")
  }

  return (
    <main className="cabinet-page">
      <header className="cabinet-page__bar">
        <button
          type="button"
          className="cabinet-page__icon-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <LuArrowLeft aria-hidden="true" />
        </button>
        <h1 className="cabinet-page__heading">My cabinet</h1>
        <button
          type="button"
          className="cabinet-page__icon-btn"
          onClick={() => void handleLogout()}
          aria-label="Log out"
        >
          <LuLogOut aria-hidden="true" />
        </button>
      </header>

      {loading && !profile ? (
        <p className="cabinet-page__loading">Loading your cabinet…</p>
      ) : profile ? (
        <>
          <ProfileHeader profile={profile} />
          <BookingsList
            bookings={bookings}
            error={bookingsError}
            onModify={handleModify}
            onCancel={handleCancel}
          />
          <HistoryList history={history} onOpenReceipt={handleOpenReceipt} />
        </>
      ) : (
        <p className="cabinet-page__loading">We could not load your profile.</p>
      )}
    </main>
  )
}

export default CabinetPage
