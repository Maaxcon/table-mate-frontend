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
  bookingsHasMore: boolean
  bookingsActionId: string | null
  cancelBooking: (publicId: string) => Promise<void>
  loadMoreBookings: () => Promise<void>
  refreshBookings: () => Promise<void>
  updateProfile: (patch: ProfileUpdate) => Promise<void>
}

const BOOKINGS_PAGE_SIZE = 5

export function useCabinet(): UseCabinetResult {
  const dispatch = useAppDispatch()
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
  const [bookingsHasMore, setBookingsHasMore] = useState(false)
  const [bookingsActionId, setBookingsActionId] = useState<string | null>(null)

  const fetchedCountRef = useRef(0)

  const loadBookingsPage = useCallback(async (offset: number, signal?: AbortSignal) => {
    const page = await fetchMyReservations({
      limit: BOOKINGS_PAGE_SIZE + 1,
      offset,
      signal,
    })
    const visible = filterActiveBookings(page).slice(0, BOOKINGS_PAGE_SIZE)
    fetchedCountRef.current = offset + visible.length

    setBookings((prev) => (offset === 0 ? visible : [...prev, ...visible]))
    setBookingsHasMore(page.length > BOOKINGS_PAGE_SIZE)
    setBookingsError(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load() {
      setLoading(true)
      const [profileResult, bookingsResult, receiptsResult] = await Promise.allSettled([
        fetchMyProfile(signal),
        fetchMyReservations({ limit: BOOKINGS_PAGE_SIZE + 1, offset: 0, signal }),
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

      if (bookingsResult.status === "fulfilled") {
        fetchedCountRef.current = bookingsResult.value.length
        setBookings(filterActiveBookings(bookingsResult.value).slice(0, BOOKINGS_PAGE_SIZE))
        setBookingsHasMore(bookingsResult.value.length > BOOKINGS_PAGE_SIZE)
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
    await loadBookingsPage(0)
  }, [loadBookingsPage])

  const loadMoreBookings = useCallback(async () => {
    try {
      await loadBookingsPage(fetchedCountRef.current)
    } catch {
      setBookingsError("We could not load more bookings.")
    }
  }, [loadBookingsPage])

  const cancelBooking = useCallback(async (publicId: string) => {
    setBookingsActionId(publicId)
    try {
      await cancelReservation(publicId)
      setBookings((prev) => prev.filter((b) => b.public_id !== publicId))
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
