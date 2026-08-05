import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const guestInit = vi.fn()
const createCartSessionForReservation = vi.fn()
const setGuestName = vi.fn()
const verifyScan = vi.fn()
const getAccessToken = vi.fn()
const ensureSession = vi.fn()

class ReservationNotYetActiveError extends Error {
  startAt: string | null
  constructor(startAt: string | null = null) {
    super("not yet active")
    this.name = "ReservationNotYetActiveError"
    this.startAt = startAt
  }
}

vi.mock("@/features/menu/api", () => ({
  guestInit: (...args: unknown[]) => guestInit(...args),
  createCartSessionForReservation: (...args: unknown[]) => createCartSessionForReservation(...args),
  setGuestName: (...args: unknown[]) => setGuestName(...args),
  verifyScan: (...args: unknown[]) => verifyScan(...args),
  ReservationNotYetActiveError,
}))

vi.mock("@/api/client", () => ({
  getAccessToken: () => getAccessToken(),
  ensureSession: () => ensureSession(),
  setAcceptLanguage: vi.fn(),
}))

const { useGuestAuth } = await import("./useGuestAuth")

// A customer access token lives 15 minutes; the hook refreshes REFRESH_MARGIN_MS
// (60s) before exp. Both tokens below are already inside that margin, standing in
// for a guest who has been browsing the menu for a while.
function tokenExpiringIn(seconds: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + seconds, cart_session_id: "cart-1" }
  return `x.${btoa(JSON.stringify(payload))}.y`
}

const STALE = tokenExpiringIn(30)
const FRESH = tokenExpiringIn(900)

describe("useGuestAuth pre-order mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    guestInit.mockRejectedValue(new ReservationNotYetActiveError("2026-08-03T19:30:00Z"))
    createCartSessionForReservation.mockResolvedValue({ public_id: "cart-1" })
    getAccessToken.mockReturnValue(STALE)
    ensureSession.mockResolvedValue(FRESH)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("opens the cart on a freshly minted token, not the expiring one", async () => {
    const { result } = renderHook(() => useGuestAuth({ reservationId: "res-1", tableId: null }))

    await waitFor(() => expect(result.current.status).toBe("ready"))

    // The cart rides this token for every later call (add item, checkout).
    // Handing it the near-expired one is what killed the cart mid-browse.
    expect(result.current.guestJwt).toBe(FRESH)
    expect(result.current.isPreorder).toBe(true)
    expect(ensureSession).toHaveBeenCalled()
  })

  it("gives up cleanly when the session can no longer be refreshed", async () => {
    ensureSession.mockResolvedValue(null)

    const { result } = renderHook(() => useGuestAuth({ reservationId: "res-1", tableId: null }))

    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(createCartSessionForReservation).not.toHaveBeenCalled()
  })
})
