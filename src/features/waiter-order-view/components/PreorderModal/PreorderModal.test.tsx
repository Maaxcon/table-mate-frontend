import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const apiFetch = vi.fn()

vi.mock("@/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  setAcceptLanguage: vi.fn(),
}))

const { PreorderModal } = await import("./PreorderModal")
const { fetchPreorder } = await import("../../api")

const reservation = {
  public_id: "res-1",
  start_at: "2026-08-03T18:00:00Z",
  end_at: "2026-08-03T20:00:00Z",
  session_ends_at: null,
  table: "12",
  guest_count: 2,
  status: "pending" as const,
  notes: null,
  name: "Ada",
  has_preorder: true,
  preorder_cooking: false,
  preorder_ready: false,
}

function response(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: String(status),
    json: async () => body,
  } as Response
}

describe("waiter pre-order loading", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("treats a server error as a failure, not an empty pre-order", async () => {
    apiFetch.mockResolvedValue(response(500))

    await expect(fetchPreorder("res-1")).rejects.toThrow()
  })

  it("still reports a genuine 204 as no pre-order", async () => {
    apiFetch.mockResolvedValue(response(204))

    await expect(fetchPreorder("res-1")).resolves.toBeNull()
  })

  it("shows an error rather than 'no pre-order found' when the load fails", async () => {
    apiFetch.mockResolvedValue(response(403))

    render(<PreorderModal reservation={reservation} onClose={vi.fn()} onCancelled={vi.fn()} />)

    // The waiter must not be told this table has no food coming when the
    // request simply failed.
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(screen.queryByText(/no pre-order found/i)).toBeNull()
  })
})
