import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useMenuPage } from "./useMenuPage"

const mocks = vi.hoisted(() => ({
  useRestaurantInfoMock: vi.fn(),
  useMenuCategoriesMock: vi.fn(),
  useMenuItemsMock: vi.fn(),
}))

vi.mock("./useRestaurantInfo", () => ({
  useRestaurantInfo: mocks.useRestaurantInfoMock,
}))

vi.mock("./useMenuCategories", () => ({
  useMenuCategories: mocks.useMenuCategoriesMock,
}))

vi.mock("./useMenuItems", () => ({
  useMenuItems: mocks.useMenuItemsMock,
}))

describe("useMenuPage", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.useRestaurantInfoMock.mockReturnValue({
      name: "Saffron",
      address: "42 Spice St",
      phone: "+1 555 0100",
      coverImage: null,
      telegramUrl: "",
      facebookUrl: "",
      settings: null,
      notFound: false,
      fetchError: null,
    })
    mocks.useMenuCategoriesMock.mockReturnValue({
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
    })
    mocks.useMenuItemsMock.mockReturnValue({
      items: [],
      itemsLoading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      itemsError: null,
      setItemLikeState: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("keeps sort and category state immediate while debouncing the data-loader inputs", () => {
    const { result } = renderHook(() => useMenuPage("rest-1", "guest-1"))

    expect(result.current.activeCategory).toBeNull()
    expect(result.current.sortOrder).toBe("sort_order")
    expect(mocks.useMenuItemsMock).toHaveBeenLastCalledWith(
      "rest-1",
      null,
      "",
      "guest-1",
      "sort_order",
    )

    act(() => {
      result.current.setActiveCategory("cat-a")
      result.current.setSortOrder("price")
      result.current.setActiveCategory("cat-b")
      result.current.setSortOrder("-price")
    })

    expect(result.current.activeCategory).toBe("cat-b")
    expect(result.current.sortOrder).toBe("-price")
    expect(mocks.useMenuItemsMock).toHaveBeenLastCalledWith(
      "rest-1",
      null,
      "",
      "guest-1",
      "sort_order",
    )

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(mocks.useMenuItemsMock).toHaveBeenLastCalledWith(
      "rest-1",
      null,
      "",
      "guest-1",
      "sort_order",
    )

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(mocks.useMenuItemsMock).toHaveBeenLastCalledWith(
      "rest-1",
      "cat-b",
      "",
      "guest-1",
      "-price",
    )
  })
})
