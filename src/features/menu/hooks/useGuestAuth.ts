import { useCallback, useEffect, useReducer, useRef } from "react"
import {
  guestInit,
  ReservationNotYetActiveError,
  setGuestName,
  verifyScan,
} from "@/features/menu/api"
import { getGuestToken } from "@/features/menu/guestToken"
import { decodeJwtPayload } from "@/features/menu/jwt"
import { menuStrings } from "@/features/menu/strings"

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
  setDisplayName: (name: string) => void
  initialize: () => void
}

type AuthState = {
  guestJwt: string | null
  cartSessionId: string | null
  status: AuthStatus
  error: string | null
}

type AuthAction =
  | { type: "LOADING" }
  | { type: "READY"; jwt: string; sessionId: string | null }
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
        error: null,
      }
    case "ERROR":
      return { ...state, status: "error", error: action.error, guestJwt: null, cartSessionId: null }
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
  const deviceId = getGuestToken()
  const [authState, dispatch] = useReducer(authReducer, {
    guestJwt: null,
    cartSessionId: null,
    status: reservationId || tableId ? "init" : "ready",
    error: null,
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

    const run = async () => {
      // Static QR carries only the table: try to activate a pending booking
      // (logged-in owner) before opening the cart. Best-effort, errors ignored.
      if (tableId) {
        await verifyScan(tableId)
      }
      return guestInit({ reservationId, tableId }, guestJwtRef.current)
    }

    run()
      .then((resp) => {
        const payload = decodeJwtPayload<{ cart_session_id?: string }>(resp.access)
        dispatch({
          type: "READY",
          jwt: resp.access,
          sessionId: payload?.cart_session_id ?? null,
        })
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

  return {
    deviceId,
    guestJwt: authState.guestJwt,
    cartSessionId: authState.cartSessionId,
    displayName,
    status: authState.status,
    error: authState.error,
    setDisplayName,
    initialize,
  }
}
