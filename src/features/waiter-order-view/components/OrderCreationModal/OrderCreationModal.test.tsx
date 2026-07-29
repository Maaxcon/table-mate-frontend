import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { MenuCategory, MenuItem } from "@/types/api/types.gen"
import { OrderCreationModal } from "./OrderCreationModal"

const mocks = vi.hoisted(() => ({
  fetchCategories: vi.fn(),
  fetchMenuItems: vi.fn(),
  createOrderWithItems: vi.fn(),
  searchMenuItems: vi.fn(),
}))

vi.mock("../../api/orderApi", () => ({
  createOrderWithItems: (...args: unknown[]) => mocks.createOrderWithItems(...args),
  fetchCategories: (...args: unknown[]) => mocks.fetchCategories(...args),
  fetchMenuItems: (...args: unknown[]) => mocks.fetchMenuItems(...args),
  searchMenuItems: (...args: unknown[]) => mocks.searchMenuItems(...args),
}))

vi.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}))

vi.mock("../../strings", () => ({
  useWaiterStrings: () => ({
    common: { close: "Close" },
    orderModal: {
      title: "Add items",
      searchPlaceholder: "Search",
      categories: { all: "All" },
      loading: "Loading",
      empty: "Empty",
      summary: {
        title: "Summary",
        empty: "No items",
        total: "Total",
        submit: "Submit",
        submitting: "Submitting",
      },
      removeAria: "Remove",
      guestOption: (slot: number) => `Guest ${slot}`,
      commentPlaceholder: "Comment",
    },
  }),
}))

function makeCategory(overrides: Partial<MenuCategory> = {}): MenuCategory {
  return {
    public_id: "cat-1",
    menu: "menu-1",
    name: "Starters",
    sort_order: 1,
    created_at: "2026-07-22T00:00:00Z",
    updated_at: "2026-07-22T00:00:00Z",
    ...overrides,
  }
}

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    public_id: "item-1",
    restaurant: "rest-1",
    menu: "menu-1",
    category: "cat-1",
    name: "Caprese",
    description: null,
    ingredients: [],
    allergens: [],
    likes_count: 0,
    is_liked: false,
    price: "12.50",
    is_available: true,
    image: "https://cdn.example.test/caprese.jpg",
    weight_grams: null,
    created_at: "2026-07-22T00:00:00Z",
    updated_at: "2026-07-22T00:00:00Z",
    ...overrides,
  }
}

describe("OrderCreationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCategories.mockResolvedValue([makeCategory()])
    mocks.fetchMenuItems.mockResolvedValue([makeMenuItem()])
    mocks.searchMenuItems.mockResolvedValue([])
    mocks.createOrderWithItems.mockResolvedValue(undefined)
  })

  it("renders menu item images in the waiter item picker", async () => {
    render(
      <OrderCreationModal
        sessionId="session-1"
        guestCount={2}
        restaurantId="rest-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    expect(await screen.findByAltText("Caprese")).toBeInTheDocument()
  })
})
