import { useCallback, useEffect, useReducer, useRef } from "react"
import { ensureSession, getAccessToken } from "@/api/client"
import {
  createCartSessionForReservation,
  guestInit,
  ReservationNotYetActiveError,
  setGuestName,
  verifyScan,
} from "@/features/menu/api"
import { getGuestToken } from "@/features/menu/guestToken"
import { decodeJwtPayload } from "@/features/menu/jwt"
import { useMenuStrings } from "@/features/menu/strings"

const DISPLAY_NAME_KEY = "tablemate.cart.display_name.v1"
const REFRESH_MARGIN_MS = 60_000

// Local HH:MM for a booking start (ISO), or null if missing/unparseable.
function formatBookingTime(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

type AuthStatus = "init" | "loading" | "ready" | "error"

type UseGuestAuthOptions = {
  reservationId?: string | null
  tableId?: string | null
}

type UseGuestAuthResult = {
  deviceId: string
  guestJwt: string | null
  cartSessionId: string | null
  displayName: string
  status: AuthStatus
  error: string | null
  // True once the cart was opened via the pre-order fallback below (own auth,
  // reservation still PENDING) rather than the normal guest-JWT flow.
  isPreorder: boolean
  setDisplayName: (name: string) => void
  initialize: () => void
}

type AuthState = {
  guestJwt: string | null
  cartSessionId: string | null
  status: AuthStatus
  error: string | null
  isPreorder: boolean
}

type AuthAction =
  | { type: "LOADING" }
  | { type: "READY"; jwt: string; sessionId: string | null; isPreorder: boolean }
  | { type: "ERROR"; error: string }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOADING":
      return { ...state, status: "loading", error: null }
    case "READY":
      return {
        ...state,
        status: "ready",
        guestJwt: action.jwt,
        cartSessionId: action.sessionId,
        isPreorder: action.isPreorder,
        error: null,
      }
    case "ERROR":
      return {
        ...state,
        status: "error",
        error: action.error,
        guestJwt: null,
        cartSessionId: null,
        isPreorder: false,
      }
  }
}

function loadDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

export function useGuestAuth({
  reservationId,
  tableId,
}: UseGuestAuthOptions = {}): UseGuestAuthResult {
  const menuStrings = useMenuStrings()
  const deviceId = getGuestToken()
  const [authState, dispatch] = useReducer(authReducer, {
    guestJwt: null,
    cartSessionId: null,
    status: reservationId || tableId ? "init" : "ready",
    error: null,
    isPreorder: false,
  })
  const [displayName, setDisplayNameState] = useReducer(
    (_prev: string, next: string) => next,
    loadDisplayName(),
  )
  const initializing = useRef(false)
  const guestJwtRef = useRef<string | null>(null)
  useEffect(() => {
    guestJwtRef.current = authState.guestJwt
  }, [authState.guestJwt])

  const setDisplayName = useCallback(
    (name: string) => {
      setDisplayNameState(name)
      try {
        localStorage.setItem(DISPLAY_NAME_KEY, name)
      } catch {
        // ignore
      }
      // Persist to backend so other guests and the waiter can see the name.
      if (authState.cartSessionId && authState.guestJwt) {
        setGuestName(authState.cartSessionId, authState.guestJwt, name).catch(() => {
          // Best-effort: don't block the UI if this fails.
        })
      }
    },
    [authState.cartSessionId, authState.guestJwt],
  )

  const initialize = useCallback(() => {
    if ((!reservationId && !tableId) || initializing.current) return
    initializing.current = true
    dispatch({ type: "LOADING" })

    const run = async (): Promise<{
      access: string
      sessionId: string | null
      isPreorder: boolean
    }> => {
      // Static QR carries only the table: try to activate a pending booking
      // (logged-in owner) before opening the cart. Best-effort, errors ignored.
      if (tableId) {
        await verifyScan(tableId)
      }
      try {
        const resp = await guestInit({ reservationId, tableId }, guestJwtRef.current)
        const payload = decodeJwtPayload<{ cart_session_id?: string }>(resp.access)
        return {
          access: resp.access,
          sessionId: payload?.cart_session_id ?? null,
          // Authoritative from the backend — a cart reused from an earlier
          // pre-order round succeeds here too, not just via the fallback
          // below, so this can't be assumed false just because guestInit()
          // didn't throw.
          isPreorder: resp.is_preorder ?? false,
        }
      } catch (err) {
        // Pre-order: the reservation exists but hasn't started yet. If the
        // caller is logged in (as its owner), open the cart directly through
        // their own auth instead of the guest-JWT gate, which requires ACTIVE.
        //
        // Mint a fresh token rather than reusing whatever sits in the store.
        // This cart rides a customer access token, which lives 15 minutes
        // where a guest token lives 4 hours, and the refresh timer below just
        // re-runs initialize() — handed back the same near-expired token, it
        // scheduled nothing new and the cart died mid-browse.
        if (err instanceof ReservationNotYetActiveError && reservationId && getAccessToken()) {
          const accessToken = await ensureSession()
          if (accessToken) {
            const session = await createCartSessionForReservation(reservationId, accessToken)
            return { access: accessToken, sessionId: session.public_id, isPreorder: true }
          }
        }
        throw err
      }
    }

    run()
      .then(({ access, sessionId, isPreorder }) => {
        dispatch({ type: "READY", jwt: access, sessionId, isPreorder })
      })
      .catch((err: Error) => {
        let msg: string
        if (err instanceof ReservationNotYetActiveError) {
          msg = menuStrings.cart.reservationNotYetActive(formatBookingTime(err.startAt))
        } else if (err.message === "NO_ACTIVE_RESERVATION") {
          msg = menuStrings.cart.noActiveReservation
        } else if (err.message === "NO_ACTIVE_SESSION") {
          msg = menuStrings.cart.sessionUnavailable
        } else {
          msg = err.message
        }
        dispatch({ type: "ERROR", error: msg })
      })
      .finally(() => {
        initializing.current = false
      })
  }, [reservationId, tableId])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!authState.guestJwt) return
    const payload = decodeJwtPayload<{ exp?: number }>(authState.guestJwt)
    if (!payload?.exp) return
    const msUntilRefresh = payload.exp * 1000 - Date.now() - REFRESH_MARGIN_MS
    const timer = setTimeout(() => initialize(), Math.max(msUntilRefresh, 0))
    return () => clearTimeout(timer)
  }, [authState.guestJwt, initialize])

  // A session can be unavailable when the page loads (table's session closed,
  // booking not active yet) and then open later. While in that error state,
  // retry on tab focus so the guest recovers without a full page reload.
  useEffect(() => {
    if (authState.status !== "error") return
    const retry = () => {
      if (document.visibilityState === "visible") initialize()
    }
    window.addEventListener("focus", retry)
    document.addEventListener("visibilitychange", retry)
    return () => {
      window.removeEventListener("focus", retry)
      document.removeEventListener("visibilitychange", retry)
    }
  }, [authState.status, initialize])

  return {
    deviceId,
    guestJwt: authState.guestJwt,
    cartSessionId: authState.cartSessionId,
    displayName,
    status: authState.status,
    error: authState.error,
    isPreorder: authState.isPreorder,
    setDisplayName,
    initialize,
  }
}
