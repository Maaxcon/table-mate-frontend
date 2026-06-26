import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCartSocket } from "./useCartSocket"

vi.mock("@/config/env", () => ({
  ENV_NOT_CONFIGURED_VALUE: "Not configured",
  env: { wsUrl: "ws://test" },
}))

// Matches the hook's internals: 4000ms auth-expired fallback, 5 retries before
// giving up. Advance past the fallback to fire each scheduled reconnect.
const AUTH_EXPIRED_RETRY_MS = 4000
const MAX_AUTH_RETRIES = 5

class MockWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  onopen: ((ev?: unknown) => void) | null = null
  onclose: ((ev: { code: number }) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  url: string
  protocols?: string | string[]

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocols = protocols
    MockWebSocket.instances.push(this)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
  }
}

function latestSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

function closeWithAuthExpired(): void {
  const ws = latestSocket()
  ws.readyState = MockWebSocket.CLOSED
  act(() => ws.onclose?.({ code: 4001 }))
  // Let the fallback timer fire so the hook attempts the next reconnect.
  act(() => vi.advanceTimersByTime(AUTH_EXPIRED_RETRY_MS))
}

describe("useCartSocket auth-expired handling", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    vi.stubGlobal("WebSocket", MockWebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("stops retrying and surfaces sessionExpired after the 4001 ceiling", () => {
    const onAuthExpired = vi.fn()
    const { result } = renderHook(() =>
      useCartSocket({
        cartSessionId: "cart-1",
        guestJwt: "jwt",
        onCartUpdated: vi.fn(),
        onAuthExpired,
      }),
    )

    for (let i = 0; i < MAX_AUTH_RETRIES + 1; i += 1) {
      closeWithAuthExpired()
    }

    expect(result.current.sessionExpired).toBe(true)
    // Refresh is asked for only up to the ceiling, then it gives up.
    expect(onAuthExpired).toHaveBeenCalledTimes(MAX_AUTH_RETRIES)
    // Initial socket + one per retry; nothing after the ceiling trips.
    expect(MockWebSocket.instances).toHaveLength(MAX_AUTH_RETRIES + 1)
  })

  it("resets the 4001 ceiling once a connection succeeds", () => {
    const onAuthExpired = vi.fn()
    const { result } = renderHook(() =>
      useCartSocket({
        cartSessionId: "cart-1",
        guestJwt: "jwt",
        onCartUpdated: vi.fn(),
        onAuthExpired,
      }),
    )

    closeWithAuthExpired()
    const reconnected = latestSocket()
    reconnected.readyState = MockWebSocket.OPEN
    act(() => reconnected.onopen?.())

    expect(result.current.isConnected).toBe(true)
    expect(result.current.sessionExpired).toBe(false)

    // A later 4001 starts the count from zero again, so it does not trip yet.
    act(() => reconnected.onclose?.({ code: 4001 }))
    expect(result.current.sessionExpired).toBe(false)
  })
})
