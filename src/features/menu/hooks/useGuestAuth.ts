import { useCallback, useEffect, useReducer, useRef } from "react"
import { guestInit } from "@/features/menu/api"
import { getGuestToken } from "@/features/menu/guestToken"
import { decodeJwtPayload } from "@/features/menu/jwt"

const DISPLAY_NAME_KEY = "tablemate.cart.display_name.v1"

type AuthStatus = "init" | "loading" | "ready" | "error"

type UseGuestAuthOptions = {
  reservationId?: string | null
  cartSessionId?: string | null
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
      return { ...state, status: "error", error: action.error }
  }
}

function loadDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? ""
  } catch {
    // localStorage can be unavailable (private mode / disabled) — start blank.
    return ""
  }
}

export function useGuestAuth({
  reservationId,
  cartSessionId: initialCartSessionId,
}: UseGuestAuthOptions = {}): UseGuestAuthResult {
  const deviceId = getGuestToken()
  const [authState, dispatch] = useReducer(authReducer, {
    guestJwt: null,
    cartSessionId: initialCartSessionId ?? null,
    status: reservationId ? "init" : "ready",
    error: null,
  })
  const [displayName, setDisplayNameState] = useReducer(
    (_prev: string, next: string) => next,
    loadDisplayName(),
  )
  const initializing = useRef(false)

  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name)
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, name)
    } catch {
      // Persisting the name is best-effort; ignore storage failures.
    }
  }, [])

  const initialize = useCallback(() => {
    if (!reservationId || initializing.current) return
    initializing.current = true
    dispatch({ type: "LOADING" })

    guestInit(deviceId, reservationId)
      .then((resp) => {
        const payload = decodeJwtPayload<{ cart_session_id?: string }>(resp.access)
        dispatch({
          type: "READY",
          jwt: resp.access,
          sessionId: payload?.cart_session_id ?? null,
        })
      })
      .catch((err: Error) => {
        const msg =
          err.message === "NO_ACTIVE_SESSION"
            ? "No active cart session found. Please ask a staff member to open your table."
            : err.message
        dispatch({ type: "ERROR", error: msg })
      })
      .finally(() => {
        initializing.current = false
      })
  }, [deviceId, reservationId])

  useEffect(() => {
    initialize()
  }, [initialize])

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
