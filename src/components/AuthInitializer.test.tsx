import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import AuthInitializer from "@/components/AuthInitializer"
import { store } from "@/store"
import { markHadSession } from "@/store/auth/sessionFlag"

vi.mock("@/api/client", () => ({
  ensureSession: vi.fn().mockResolvedValue(null),
  apiFetch: vi.fn(),
}))

import { ensureSession } from "@/api/client"

const mockedEnsureSession = vi.mocked(ensureSession)

function renderInit() {
  return render(
    <Provider store={store}>
      <AuthInitializer>
        <div>child-content</div>
      </AuthInitializer>
    </Provider>,
  )
}

describe("AuthInitializer", () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, "", "/")
    mockedEnsureSession.mockClear()
    mockedEnsureSession.mockResolvedValue(null)
  })

  it("skips session restore for guests with no prior session", async () => {
    renderInit()

    expect(await screen.findByText("child-content")).toBeInTheDocument()
    expect(mockedEnsureSession).not.toHaveBeenCalled()
  })

  it("skips session restore during the OAuth redirect flow", async () => {
    markHadSession()
    window.history.replaceState({}, "", "/?code=abc123")

    renderInit()

    expect(await screen.findByText("child-content")).toBeInTheDocument()
    expect(mockedEnsureSession).not.toHaveBeenCalled()
  })

  it("restores the session when the had-session flag is set", async () => {
    markHadSession()

    renderInit()

    expect(await screen.findByText("child-content")).toBeInTheDocument()
    expect(mockedEnsureSession).toHaveBeenCalledTimes(1)
  })
})
