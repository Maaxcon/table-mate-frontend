import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useBookingData } from "./useBookingData"

vi.mock("../api", () => ({
  fetchLayoutData: vi
    .fn()
    .mockResolvedValue({ tables: [], layout: null, upcoming_reservations: [] }),
  fetchZones: vi.fn().mockResolvedValue([]),
  fetchRestaurantSettings: vi.fn().mockResolvedValue({ working_hours: null, timezone: null }),
  fetchMyReservations: vi.fn(),
}))

import { fetchMyReservations } from "../api"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useBookingData reservationsLoading", () => {
  it("goes back to loading (not the stale empty list) when auth flips from false to true after mount", async () => {
    // Never resolves during the test — isolates the state visible WHILE the
    // fetch is in flight, right after the auth flip.
    let resolveFetch: (() => void) | undefined
    vi.mocked(fetchMyReservations).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = () => resolve([])
      }),
    )

    const { result, rerender } = renderHook(
      ({ isAuthenticated }) => useBookingData("restaurant-1", isAuthenticated),
      { initialProps: { isAuthenticated: false } },
    )

    // Unauthenticated at mount: loadReservations returns early, so nothing
    // is loading and the list is empty (the actual "logged out" state).
    await waitFor(() => expect(result.current.tablesLoading).toBe(false))
    expect(result.current.reservationsLoading).toBe(false)
    expect(result.current.reservations).toEqual([])

    // Regression: this flip used to leave reservationsLoading at false while
    // the fetch was in flight — reservations was still [], so "My Bookings"
    // rendered the "no bookings yet" empty state instead of a spinner.
    act(() => {
      rerender({ isAuthenticated: true })
    })

    expect(result.current.reservationsLoading).toBe(true)
    expect(fetchMyReservations).toHaveBeenCalledWith("restaurant-1")

    await act(async () => {
      resolveFetch?.()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.reservationsLoading).toBe(false))
  })
})
