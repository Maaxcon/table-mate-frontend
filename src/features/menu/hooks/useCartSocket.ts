import { useCallback, useEffect, useRef, useState } from "react"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { CART_CLIENT_ID } from "@/features/menu/clientId"

type UseCartSocketOptions = {
  cartSessionId: string | null
  guestJwt: string | null
  onCartUpdated: () => void
  onAuthExpired: () => void
}

type UseCartSocketResult = {
  isConnected: boolean
  sessionExpired: boolean
}

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000
// Auth-expired fallback: long enough for a token refresh to win the race and
// reconnect with the fresh token, short enough to recover if the refresh fails.
const AUTH_EXPIRED_RETRY_MS = 4000
// Cap consecutive 4001 (auth-expired) closes. A healthy reconnect resets the
// counter (onopen), so this only trips when refreshed tokens keep getting
// rejected — stop retrying instead of looping refresh+reconnect forever.
const MAX_AUTH_RETRIES = 5

function jitter(delay: number): number {
  return delay * (0.5 + Math.random() * 0.5)
}

export function useCartSocket({
  cartSessionId,
  guestJwt,
  onCartUpdated,
  onAuthExpired,
}: UseCartSocketOptions): UseCartSocketResult {
  const [isConnected, setIsConnected] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const authRetryRef = useRef(0)
  const onCartUpdatedRef = useRef(onCartUpdated)
  const onAuthExpiredRef = useRef(onAuthExpired)
  const mountedRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})
  const shouldSyncRef = useRef(false)

  useEffect(() => {
    onCartUpdatedRef.current = onCartUpdated
  }, [onCartUpdated])

  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired
  }, [onAuthExpired])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!cartSessionId || !guestJwt) return
    if (!mountedRef.current) return

    if (wsRef.current?.readyState === WebSocket.OPEN) return

    cleanup()

    if (env.wsUrl === ENV_NOT_CONFIGURED_VALUE) return

    const url = `${env.wsUrl}/cart/${cartSessionId}/`
    const ws = new WebSocket(url, ["access_token", guestJwt])
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close()
        return
      }
      attemptRef.current = 0
      authRetryRef.current = 0
      setIsConnected(true)
      setSessionExpired(false)
      if (shouldSyncRef.current) {
        shouldSyncRef.current = false
        onCartUpdatedRef.current()
      }
    }

    ws.onclose = (event) => {
      if (!mountedRef.current) return
      setIsConnected(false)
      wsRef.current = null

      // 4003 = forbidden: access denied for good, retrying is pointless.
      if (event.code === 4003) {
        shouldSyncRef.current = false
        return
      }

      shouldSyncRef.current = true

      // 4001 = auth expired: ask the app to refresh the guest token. The new
      // token changes the connect deps, so the effect reconnects with it and its
      // cleanup clears the fallback timer below — no reconnect on the stale
      // token. We keep ONE longer fallback (not the short backoff) so a *failed*
      // refresh still retries instead of the socket dying, without racing the
      // refresh and looping on the expired token.
      if (event.code === 4001) {
        // A healthy connection resets authRetryRef in onopen, so this only grows
        // while refreshed tokens keep being rejected. Once the ceiling is hit,
        // stop the refresh+reconnect loop and surface an expired state instead.
        authRetryRef.current += 1
        if (authRetryRef.current > MAX_AUTH_RETRIES) {
          shouldSyncRef.current = false
          setSessionExpired(true)
          return
        }
        onAuthExpiredRef.current()
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) connectRef.current()
        }, AUTH_EXPIRED_RETRY_MS)
        return
      }

      attemptRef.current += 1
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attemptRef.current - 1), MAX_DELAY_MS)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current()
      }, jitter(delay))
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; client_id?: string }
        if (data.type === "cart_updated" && data.client_id !== CART_CLIENT_ID) {
          onCartUpdatedRef.current()
        }
      } catch {
        // ignore malformed messages
      }
    }
  }, [cartSessionId, guestJwt, cleanup])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup])

  return { isConnected, sessionExpired }
}
