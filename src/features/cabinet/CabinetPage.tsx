import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LuArrowLeft, LuLogOut } from "react-icons/lu"
import { apiFetch } from "@/api/client"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import { BookingsList, HistoryList, ProfileHeader } from "./components"
import { CabinetStats } from "./components/CabinetStats/CabinetStats"
import { ReceiptDialog } from "./components/ReceiptDialog/ReceiptDialog"
import { useCabinet } from "./hooks/useCabinet"
import type { HistoryEntry, Reservation } from "./types"
import "./CabinetPage.css"

function CabinetPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile, bookings, history, loading, bookingsError, cancelBooking, updateProfile } =
    useCabinet()
  const [receipt, setReceipt] = useState<HistoryEntry | null>(null)

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
    setReceipt(entry)
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
          <ProfileHeader profile={profile} onSave={updateProfile} />
          <CabinetStats history={history} />
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

      {receipt && <ReceiptDialog entry={receipt} onClose={() => setReceipt(null)} />}
    </main>
  )
}

export default CabinetPage
