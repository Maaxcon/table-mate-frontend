import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import MenuHeader from "@/features/menu/components/MenuHeader/MenuHeader"
import type { AuthUser } from "@/store/auth/authSlice"

const admin: AuthUser = {
  public_id: "admin-uuid",
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Min",
  role: "admin",
  restaurantId: "restaurant-1",
}

const waiter: AuthUser = {
  ...admin,
  email: "waiter@example.com",
  firstName: "Will",
  lastName: "Waiter",
  role: "waiter",
}

function renderHeader(user: AuthUser | null, restaurantId = "restaurant-1") {
  return render(
    <MemoryRouter initialEntries={[`/menu/${restaurantId}?table=table-1`]}>
      <MenuHeader
        name="Test restaurant"
        coverImage={null}
        settings={null}
        user={user}
        restaurantId={restaurantId}
        onSignOut={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe("MenuHeader staff navigation", () => {
  beforeEach(() => sessionStorage.clear())

  it("shows the admin area only in the admin's own restaurant", () => {
    renderHeader(admin)
    expect(screen.getByRole("link", { name: "До адмін-панелі" })).toHaveAttribute("href", "/admin")
  })

  it("shows the waiter area in the waiter's own restaurant", () => {
    renderHeader(waiter)
    expect(screen.getByRole("link", { name: "До робочого залу" })).toHaveAttribute(
      "href",
      "/waiter-order",
    )
  })

  it("does not expose staff navigation in another restaurant", () => {
    renderHeader(admin, "restaurant-2")
    expect(screen.queryByRole("link", { name: "До адмін-панелі" })).not.toBeInTheDocument()
  })

  it("returns a guest to the same menu after sign-in", () => {
    renderHeader(null)
    fireEvent.click(screen.getByRole("link", { name: "Увійти" }))

    const stored = sessionStorage.getItem("tablemate.post_login_redirect.v1")
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored ?? "{}").path).toBe("/menu/restaurant-1?table=table-1")
  })
})
