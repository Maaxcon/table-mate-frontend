import { useCallback, useEffect, useRef, useState } from "react"
import { setUser } from "@/store/auth/authSlice"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BOOKINGS_PAGE_SIZE,
  cancelReservation,
  fetchMyProfile,
  fetchMyReceipts,
  fetchMyReservations,
  filterActiveBookings,
  updateMyProfile,
  type ProfileUpdate,
} from "@/features/cabinet/api"
import type { CabinetProfile, HistoryEntry, Reservation } from "@/features/cabinet/types"

type UseCabinetResult = {
  profile: CabinetProfile | null
  bookings: Reservation[]
  allReservations: Reservation[]
  history: HistoryEntry[]
  loading: boolean
  bookingsError: string | null
  historyError: string | null
  bookingsHasMore: boolean
  bookingsActionId: string | null
  cancelBooking: (publicId: string) => Promise<void>
  loadMoreBookings: () => Promise<void>
  refreshBookings: () => Promise<void>
  updateProfile: (patch: ProfileUpdate) => Promise<void>
}

export function useCabinet(): UseCabinetResult {
  const dispatch = useAppDispatch()
  const storeUser = useAppSelector((s) => s.auth.user)
  const storeUserRef = useRef(storeUser)
  useEffect(() => {
    storeUserRef.current = storeUser
  }, [storeUser])

  const [profile, setProfile] = useState<CabinetProfile | null>(null)
  const [bookings, setBookings] = useState<Reservation[]>([])
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [bookingsHasMore, setBookingsHasMore] = useState(false)
  const [bookingsActionId, setBookingsActionId] = useState<string | null>(null)

  const currentOffsetRef = useRef(0)

  const loadBookingsPage = useCallback(async (offset: number, signal?: AbortSignal) => {
    const items = await fetchMyReservations({ limit: BOOKINGS_PAGE_SIZE, offset, signal })
    const visible = filterActiveBookings(items)
    currentOffsetRef.current = offset

    setBookings((prev) => (offset === 0 ? visible : [...prev, ...visible]))
    setBookingsHasMore(visible.length >= BOOKINGS_PAGE_SIZE)
    setBookingsError(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      setLoading(true)
      const [profileResult, bookingsResult, allReservationsResult, receiptsResult] =
        await Promise.allSettled([
          fetchMyProfile(signal),
          fetchMyReservations({ limit: BOOKINGS_PAGE_SIZE, offset: 0, signal }),
          fetchMyReservations({ signal, status: ["pending", "active"] }),
          fetchMyReceipts(signal),
        ])

      if (signal.aborted) return

      const fallbackUser = storeUserRef.current
      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value)
      } else if (fallbackUser) {
        setProfile({
          firstName: fallbackUser.firstName,
          lastName: fallbackUser.lastName,
          email: fallbackUser.email,
          phone: null,
          role: fallbackUser.role,
          createdAt: "",
        })
      }

      if (allReservationsResult.status === "fulfilled") {
        setAllReservations(allReservationsResult.value)
      }

      if (bookingsResult.status === "fulfilled") {
        const visible = filterActiveBookings(bookingsResult.value)
        currentOffsetRef.current = 0
        setBookings(visible)
        setBookingsHasMore(visible.length >= BOOKINGS_PAGE_SIZE)
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

  const refreshBookings = useCallback(async () => {
    try {
      await loadBookingsPage(0)
    } catch {
      setBookingsError("We could not refresh your bookings.")
    }
  }, [loadBookingsPage])

  const loadMoreBookings = useCallback(async () => {
    try {
      await loadBookingsPage(currentOffsetRef.current + BOOKINGS_PAGE_SIZE)
    } catch {
      setBookingsError("We could not load more bookings.")
    }
  }, [loadBookingsPage])

  const cancelBooking = useCallback(async (publicId: string) => {
    setBookingsActionId(publicId)
    try {
      await cancelReservation(publicId)
      setBookings((prev) => prev.filter((b) => b.public_id !== publicId))
      setAllReservations((prev) => prev.filter((r) => r.public_id !== publicId))
      setBookingsError(null)
    } catch (err) {
      setBookingsError("We could not cancel this booking.")
      throw err
    } finally {
      setBookingsActionId(null)
    }
  }, [])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      const updated = await updateMyProfile(patch)
      setProfile(updated)
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
  }
}
