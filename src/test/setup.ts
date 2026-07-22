import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, vi } from "vitest"
import i18n from "@/i18n/config"

// Ensure i18n is fully initialized before any test runs.
beforeAll(async () => {
  if (!i18n.isInitialized) {
    await i18n.init()
  }
  await i18n.changeLanguage("uk")
})

afterAll(() => {
  i18n.changeLanguage("uk")
})

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

// jsdom in this setup ships a non-functional localStorage stub, so provide a
// minimal in-memory implementation for tests that touch it.
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
}

vi.stubGlobal("localStorage", createMemoryStorage())

// RTL doesn't auto-clean between tests with globals enabled outside of the
// built-in auto-cleanup wiring, so unmount explicitly.
afterEach(() => {
  cleanup()
})
