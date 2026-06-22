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
  onAuthExpired,
}: UseCartSocketOptions): UseCartSocketResult {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
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

      if (event.code === 4003) {
        shouldSyncRef.current = false
        return
      }

      if (event.code === 4001) {
        shouldSyncRef.current = true
        onAuthExpiredRef.current()
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

  return { isConnected }
}
