import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LuArrowLeft, LuLogOut } from "react-icons/lu"
import { apiFetch } from "@/api/client"
import { CancellationConfirmationModal } from "@/features/reservation/CancellationConfirmationModal"
import { RescheduleModal } from "@/features/reservation/RescheduleModal"
import { clearAuth } from "@/store/auth/authSlice"
import { useAppDispatch } from "@/store/hooks"
import {
  BookingsList,
  CabinetStats,
  HistoryList,
  ProfileHeader,
  ReceiptDialog,
  ReservationCalendar,
} from "./components"
import { useCabinet } from "./hooks/useCabinet"
import type { HistoryEntry, Reservation } from "./types"
import "./CabinetPage.css"

function CabinetPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const {
    profile,
    bookings,
    allReservations,
    history,
    loading,
    bookingsError,
    historyError,
    bookingsHasMore,
    bookingsActionId,
    cancelBooking,
    loadMoreBookings,
    refreshBookings,
    updateProfile,
  } = useCabinet()
  const [receipt, setReceipt] = useState<HistoryEntry | null>(null)
  const [modifyTarget, setModifyTarget] = useState<Reservation | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" })
    } finally {
      dispatch(clearAuth())
      navigate("/", { replace: true })
    }
  }

  const handleModify = (booking: Reservation) => {
    setModifyTarget(booking)
  }

  const handleCancel = (booking: Reservation) => {
    setCancelTarget(booking)
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelBooking(cancelTarget.public_id)
      setCancelTarget(null)
    } catch {
      // The hook exposes the error in the bookings section.
    }
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
          <ReservationCalendar reservations={allReservations} history={history} />
          <BookingsList
            bookings={bookings}
            error={bookingsError}
            hasMore={bookingsHasMore}
            actionId={bookingsActionId}
            onModify={handleModify}
            onCancel={handleCancel}
            onLoadMore={() => void loadMoreBookings()}
          />
          <HistoryList history={history} error={historyError} onOpenReceipt={handleOpenReceipt} />
        </>
      ) : (
        <p className="cabinet-page__loading">We could not load your profile.</p>
      )}

      {receipt && <ReceiptDialog entry={receipt} onClose={() => setReceipt(null)} />}
      {modifyTarget && (
        <RescheduleModal
          publicId={modifyTarget.public_id}
          tableNumber={modifyTarget.table_info?.table_number ?? modifyTarget.table ?? ""}
          tablePublicId={modifyTarget.table_info?.public_id ?? modifyTarget.table ?? ""}
          restaurantId={modifyTarget.restaurant_info?.public_id ?? modifyTarget.restaurant}
          currentDate={modifyTarget.start_at}
          currentStart={modifyTarget.start_at}
          currentEnd={modifyTarget.end_at}
          currentGuests={modifyTarget.guest_count}
          tableCapacity={modifyTarget.table_info?.capacity ?? 10}
          workingHours={null}
          onClose={() => setModifyTarget(null)}
          onSuccess={() => {
            setModifyTarget(null)
            void refreshBookings()
          }}
        />
      )}
      {cancelTarget && (
        <CancellationConfirmationModal
          isSubmitting={bookingsActionId === cancelTarget.public_id}
          onConfirm={() => void handleConfirmCancel()}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </main>
  )
}

export default CabinetPage
