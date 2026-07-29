import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LuArrowLeft, LuLogOut } from "react-icons/lu"
import { CancellationConfirmationModal } from "@/features/reservation/CancellationConfirmationModal"
import { RescheduleModal } from "@/features/reservation/RescheduleModal"
import { useLogout } from "@/features/auth/hooks/useLogout"
import {
  BookingsList,
  CabinetStats,
  FeedbackHistoryList,
  HistoryList,
  ProfileHeader,
  ReceiptDialog,
  ReservationCalendar,
} from "./components"
import { useCabinet } from "./hooks/useCabinet"
import { useCabinetStrings } from "./strings"
import type { HistoryEntry, Reservation } from "./types"
import "./CabinetPage.css"

function CabinetPage() {
  const navigate = useNavigate()
  const { logout, logoutFailed } = useLogout()
  const strings = useCabinetStrings()
  const {
    profile,
    bookings,
    allReservations,
    history,
    feedback,
    loading,
    bookingsError,
    historyError,
    feedbackError,
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
          aria-label={strings.page.backAria}
        >
          <LuArrowLeft aria-hidden="true" />
        </button>
        <h1 className="cabinet-page__heading">{strings.page.heading}</h1>
        <button
          type="button"
          className="cabinet-page__icon-btn"
          onClick={() => void logout()}
          aria-label={strings.page.logoutAria}
        >
          <LuLogOut aria-hidden="true" />
        </button>
      </header>

      {logoutFailed && (
        <p className="cabinet-page__logout-error" role="alert">
          {strings.page.logoutError}
        </p>
      )}

      {loading && !profile ? (
        <p className="cabinet-page__loading">{strings.page.loading}</p>
      ) : profile ? (
        <>
          <ProfileHeader profile={profile} onSave={updateProfile} />
          <CabinetStats history={history} />
          <ReservationCalendar reservations={allReservations} history={history} loading={loading} />
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
          <FeedbackHistoryList feedback={feedback} history={history} error={feedbackError} />
        </>
      ) : (
        <p className="cabinet-page__loading">{strings.page.noProfile}</p>
      )}

      {receipt && <ReceiptDialog entry={receipt} onClose={() => setReceipt(null)} />}
      {modifyTarget && (
        <RescheduleModal
          publicId={modifyTarget.public_id}
          tableNumber={modifyTarget.table_info?.public_number ?? modifyTarget.table ?? ""}
          tablePublicId={modifyTarget.table_info?.public_id ?? modifyTarget.table ?? ""}
          restaurantId={modifyTarget.restaurant_info?.public_id ?? modifyTarget.restaurant}
          currentStart={modifyTarget.start_at}
          currentEnd={modifyTarget.end_at}
          currentGuests={modifyTarget.guest_count}
          tableCapacity={modifyTarget.table_info?.capacity ?? 10}
          workingHours={null}
          endTimeOnly={modifyTarget.status === "active"}
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
