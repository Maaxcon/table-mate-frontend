import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"
import en from "../../public/locales/en/translation.json"
import uk from "../../public/locales/uk/translation.json"

// Translations are served at runtime via i18next-http-backend from
// public/locales. Serve them from that same single source in tests so i18n
// initializes deterministically instead of hitting the network.
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

// jsdom ships no ResizeObserver; components that observe layout (e.g.
// FloorPlanView) need a stub.
function stubResizeObserver(): void {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
}

// jsdom's localStorage is non-functional, so provide an in-memory store.
function stubRuntimeGlobals(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const match = String(input).match(/\/locales\/(en|uk)\/translation\.json/)
      const data = match ? (match[1] === "en" ? en : uk) : undefined
      return {
        ok: Boolean(data),
        status: data ? 200 : 404,
        json: async () => data ?? {},
        text: async () => JSON.stringify(data ?? {}),
      }
    }),
  )
  stubResizeObserver()
  vi.stubGlobal("localStorage", createMemoryStorage())
}

// Some test files call vi.unstubAllGlobals() in their own afterEach, which also
// tears these stubs down, so re-install them before every test and at the end.
stubRuntimeGlobals()
beforeEach(() => stubRuntimeGlobals())

let i18n: typeof import("@/i18n/config").default | undefined

// Ensure i18n is fully initialized before any test runs.
beforeAll(async () => {
  i18n = (await import("@/i18n/config")).default
  if (!i18n.isInitialized) {
    await i18n.init()
  }
  await i18n.changeLanguage("uk")
})

afterAll(() => {
  stubRuntimeGlobals()
  i18n?.changeLanguage("uk")
})

// RTL doesn't auto-clean between tests with globals enabled outside of the
// built-in auto-cleanup wiring, so unmount explicitly.
afterEach(() => {
  cleanup()
})
