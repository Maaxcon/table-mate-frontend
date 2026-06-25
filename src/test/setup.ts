import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// jsdom has no ResizeObserver; components that observe layout (e.g. FloorPlanView)
// need a stub.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

// RTL doesn't auto-clean between tests with globals enabled outside of the
// built-in auto-cleanup wiring, so unmount explicitly.
afterEach(() => {
  cleanup()
})
