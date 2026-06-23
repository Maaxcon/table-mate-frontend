import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// RTL doesn't auto-clean between tests with globals enabled outside of the
// built-in auto-cleanup wiring, so unmount explicitly.
afterEach(() => {
  cleanup()
})
