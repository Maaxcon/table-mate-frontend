import { useCallback, useEffect, useRef, useState } from "react"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"

type UseCartSocketOptions = {
  cartSessionId: string | null
  guestJwt: string | null
  onCartUpdated: () => void
}

type UseCartSocketResult = {
  isConnected: boolean
  reconnect: () => void
}

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

function jitter(delay: number): number {
  return delay * (0.5 + Math.random() * 0.5)
}

export function useCartSocket({
  cartSessionId,
  guestJwt,
  onCartUpdated,
}: UseCartSocketOptions): UseCartSocketResult {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const onCartUpdatedRef = useRef(onCartUpdated)
  const mountedRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})
  const shouldSyncRef = useRef(false)

  useEffect(() => {
    onCartUpdatedRef.current = onCartUpdated
  }, [onCartUpdated])

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

    // Pass the token via Sec-WebSocket-Protocol instead of the URL so it never
    // lands in access logs or browser history.
    const url = `${env.wsUrl}/cart/${cartSessionId}/`
    const ws = new WebSocket(url, ["access_token", guestJwt])
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close()
        return
      }
      attemptRef.current = 0
      setIsConnected(true)
      if (shouldSyncRef.current) {
        shouldSyncRef.current = false
        onCartUpdatedRef.current()
      }
    }

    ws.onclose = (event) => {
      if (!mountedRef.current) return
      setIsConnected(false)
      wsRef.current = null

      if (event.code === 4001 || event.code === 4003) {
        shouldSyncRef.current = false
        return
      }

      shouldSyncRef.current = true
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
        const data = JSON.parse(event.data) as { type: string }
        if (data.type === "cart_updated") {
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

  const reconnect = useCallback(() => {
    attemptRef.current = 0
    shouldSyncRef.current = true
    connectRef.current()
  }, [])

  return { isConnected, reconnect }
}
