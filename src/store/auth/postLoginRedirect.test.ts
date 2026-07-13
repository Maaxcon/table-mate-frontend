import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearPostLoginRedirect,
  peekPostLoginRedirect,
  setPostLoginRedirect,
} from "@/store/auth/postLoginRedirect"

describe("postLoginRedirect", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("reports nothing before anything is stored", () => {
    expect(peekPostLoginRedirect()).toBeNull()
  })

  it("stores and reads back the path", () => {
    setPostLoginRedirect("/admin/floor-plan/edit")
    expect(peekPostLoginRedirect()).toBe("/admin/floor-plan/edit")
  })

  it("does not clear on peek — a caller must clear explicitly once used", () => {
    setPostLoginRedirect("/cabinet")
    peekPostLoginRedirect()
    expect(peekPostLoginRedirect()).toBe("/cabinet")
  })

  it("clears the stored path", () => {
    setPostLoginRedirect("/cabinet")
    clearPostLoginRedirect()
    expect(peekPostLoginRedirect()).toBeNull()
  })

  it("still returns a path stored just under 5 minutes ago", () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    setPostLoginRedirect("/waiter-order")

    vi.setSystemTime(5 * 60 * 1000 - 1)
    expect(peekPostLoginRedirect()).toBe("/waiter-order")
  })

  it("ignores a path stored more than 5 minutes ago", () => {
    // Reproduces the real bug: bounced -> abandoned (browsed as guest) ->
    // logged in much later should NOT honor the stale target.
    vi.useFakeTimers()
    vi.setSystemTime(0)
    setPostLoginRedirect("/admin/floor-plan/edit")

    vi.setSystemTime(5 * 60 * 1000 + 1)
    expect(peekPostLoginRedirect()).toBeNull()
  })

  it("does not throw and reports null/no-op when sessionStorage is unavailable", () => {
    const denied = () => {
      throw new Error("storage denied")
    }
    vi.spyOn(sessionStorage, "setItem").mockImplementation(denied)
    vi.spyOn(sessionStorage, "getItem").mockImplementation(denied)
    vi.spyOn(sessionStorage, "removeItem").mockImplementation(denied)

    expect(() => setPostLoginRedirect("/cabinet")).not.toThrow()
    expect(() => clearPostLoginRedirect()).not.toThrow()
    expect(peekPostLoginRedirect()).toBeNull()
  })

  it("does not throw on a corrupted stored value", () => {
    sessionStorage.setItem("tablemate.post_login_redirect.v1", "not json")
    expect(peekPostLoginRedirect()).toBeNull()
  })
})
