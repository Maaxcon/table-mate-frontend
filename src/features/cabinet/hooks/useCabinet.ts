import { useCallback, useEffect, useRef, useState } from "react"
import { setUser } from "@/store/auth/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  cancelReservation,
  fetchMyProfile,
  fetchMyReceipts,
  fetchMyReservations,
  filterActiveBookings,
  updateMyProfile,
  type ProfileUpdate,
} from "../api"
import type { CabinetProfile, HistoryEntry, Reservation } from "../types"

type UseCabinetResult = {
  profile: CabinetProfile | null
  bookings: Reservation[]
  history: HistoryEntry[]
  loading: boolean
  bookingsError: string | null
  historyError: string | null
  cancelBooking: (publicId: string) => void
  updateProfile: (patch: ProfileUpdate) => Promise<void>
}

export function useCabinet(): UseCabinetResult {
  const dispatch = useAppDispatch()
  // The store already holds the signed-in user; use it as an instant fallback
  // for the header while the full profile (with "member since") loads.
  const storeUser = useAppSelector((s) => s.auth.user)
  const storeUserRef = useRef(storeUser)
  useEffect(() => {
    storeUserRef.current = storeUser
  }, [storeUser])

  const [profile, setProfile] = useState<CabinetProfile | null>(null)
  const [bookings, setBookings] = useState<Reservation[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      setLoading(true)
      const [profileResult, bookingsResult, receiptsResult] = await Promise.allSettled([
        fetchMyProfile(signal),
        fetchMyReservations(signal),
        fetchMyReceipts(signal),
      ])

      if (signal.aborted) return

      const fallbackUser = storeUserRef.current
      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value)
      } else if (fallbackUser) {
        // Fall back to the store user; createdAt is unknown here.
        setProfile({
          firstName: fallbackUser.firstName,
          lastName: fallbackUser.lastName,
          email: fallbackUser.email,
          phone: null,
          role: fallbackUser.role,
          createdAt: "",
        })
      }

      if (bookingsResult.status === "fulfilled") {
        setBookings(filterActiveBookings(bookingsResult.value))
        setBookingsError(null)
      } else {
        setBookingsError("We could not load your bookings.")
      }

      if (receiptsResult.status === "fulfilled") {
        setHistory(receiptsResult.value)
        setHistoryError(null)
      } else {
        setHistoryError("We could not load your history.")
      }

      setLoading(false)
    }

    void load()
    return () => controller.abort()
  }, [])

  const cancelBooking = useCallback((publicId: string) => {
    // Optimistic: drop it from the active list right away.
    setBookings((prev) => prev.filter((b) => b.public_id !== publicId))
    void cancelReservation(publicId)
  }, [])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      const updated = await updateMyProfile(patch)
      setProfile(updated)
      // Keep the Redux user in sync so the rest of the app shows the new data.
      dispatch(
        setUser({
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          restaurantId: storeUserRef.current?.restaurantId ?? null,
        }),
      )
    },
    [dispatch],
  )

  return {
    profile,
    bookings,
    history,
    loading,
    bookingsError,
    historyError,
    cancelBooking,
    updateProfile,
  }
}
