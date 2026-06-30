import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearHadSession, hasHadSession, markHadSession } from "@/store/auth/sessionFlag"

describe("sessionFlag", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reports false before anything is marked", () => {
    expect(hasHadSession()).toBe(false)
  })

  it("marks and reads the flag", () => {
    markHadSession()
    expect(hasHadSession()).toBe(true)
  })

  it("clears the flag", () => {
    markHadSession()
    clearHadSession()
    expect(hasHadSession()).toBe(false)
  })

  it("does not throw and reports false when localStorage is unavailable", () => {
    const denied = () => {
      throw new Error("storage denied")
    }
    vi.spyOn(localStorage, "setItem").mockImplementation(denied)
    vi.spyOn(localStorage, "getItem").mockImplementation(denied)
    vi.spyOn(localStorage, "removeItem").mockImplementation(denied)

    expect(() => markHadSession()).not.toThrow()
    expect(() => clearHadSession()).not.toThrow()
    expect(hasHadSession()).toBe(false)
  })
})
