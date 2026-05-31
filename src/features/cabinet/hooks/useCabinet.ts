import { useCallback, useEffect, useState } from "react"
import { useAppSelector } from "@/store/hooks"
import {
  cancelReservation,
  fetchMyProfile,
  fetchMyReservations,
  filterActiveBookings,
} from "../api"
import { MOCK_HISTORY } from "../data/mockHistory"
import type { CabinetProfile, HistoryEntry, Reservation } from "../types"

type UseCabinetResult = {
  profile: CabinetProfile | null
  bookings: Reservation[]
  history: HistoryEntry[]
  loading: boolean
  bookingsError: string | null
  cancelBooking: (publicId: string) => void
}

export function useCabinet(): UseCabinetResult {
  // The store already holds the signed-in user; use it as an instant fallback
  // for the header while the full profile (with "member since") loads.
  const storeUser = useAppSelector((s) => s.auth.user)

  const [profile, setProfile] = useState<CabinetProfile | null>(null)
  const [bookings, setBookings] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      setLoading(true)
      const [profileResult, bookingsResult] = await Promise.allSettled([
        fetchMyProfile(signal),
        fetchMyReservations(signal),
      ])

      if (signal.aborted) return

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value)
      } else if (storeUser) {
        // Fall back to the store user; createdAt is unknown here.
        setProfile({
          firstName: storeUser.firstName,
          lastName: storeUser.lastName,
          email: storeUser.email,
          phone: null,
          role: storeUser.role,
          createdAt: "",
        })
      }

      if (bookingsResult.status === "fulfilled") {
        setBookings(filterActiveBookings(bookingsResult.value))
        setBookingsError(null)
      } else {
        setBookingsError("We could not load your bookings.")
      }

      setLoading(false)
    }

    void load()
    return () => controller.abort()
  }, [storeUser])

  const cancelBooking = useCallback((publicId: string) => {
    // Optimistic: drop it from the active list right away.
    setBookings((prev) => prev.filter((b) => b.public_id !== publicId))
    void cancelReservation(publicId)
  }, [])

  return {
    profile,
    bookings,
    history: MOCK_HISTORY,
    loading,
    bookingsError,
    cancelBooking,
  }
}
