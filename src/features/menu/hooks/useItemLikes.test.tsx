import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { MenuItem } from "@/features/menu/types"
import { useItemLikes } from "./useItemLikes"

const mocks = vi.hoisted(() => ({
  toggleItemLikeMock: vi.fn(),
}))

vi.mock("@/features/menu/api", () => ({
  toggleItemLike: mocks.toggleItemLikeMock,
}))

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    public_id: "dish-1",
    restaurant: "rest-1",
    menu: "menu-1",
    name: "Burger",
    description: null,
    price: "10.00",
    image: null,
    category: null,
    sort_order: 1,
    is_available: true,
    is_liked: false,
    likes_count: 0,
    ingredients: [],
    allergens: [],
    weight_grams: null,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...overrides,
  } as MenuItem
}

describe("useItemLikes", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.toggleItemLikeMock.mockResolvedValue({
      public_id: "dish-1",
      is_liked: true,
      likes_count: 1,
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("optimistically updates immediately and collapses rapid taps into one request", async () => {
    const onLiked = vi.fn()
    const { result } = renderHook(() => useItemLikes("rest-1", "guest-1", onLiked))
    const baseItem = makeItem()

    act(() => {
      result.current.toggleLike(baseItem)
      result.current.toggleLike({ ...baseItem, is_liked: true, likes_count: 1 })
      result.current.toggleLike(baseItem)
    })

    expect(onLiked).toHaveBeenCalledTimes(3)
    expect(onLiked).toHaveBeenNthCalledWith(1, "dish-1", true, 1)
    expect(onLiked).toHaveBeenNthCalledWith(2, "dish-1", false, 0)
    expect(onLiked).toHaveBeenNthCalledWith(3, "dish-1", true, 1)
    expect(mocks.toggleItemLikeMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })

    expect(mocks.toggleItemLikeMock).toHaveBeenCalledTimes(1)
    expect(mocks.toggleItemLikeMock).toHaveBeenCalledWith(
      "rest-1",
      "dish-1",
      "guest-1",
      expect.any(AbortSignal),
    )
  })

  it("aborts the in-flight request when the hook unmounts", async () => {
    let resolveRequest:
      | ((value: { public_id: string; is_liked: boolean; likes_count: number }) => void)
      | null = null
    mocks.toggleItemLikeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const onLiked = vi.fn()
    const { result, unmount } = renderHook(() => useItemLikes("rest-1", "guest-1", onLiked))

    act(() => {
      result.current.toggleLike(makeItem())
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })

    expect(mocks.toggleItemLikeMock).toHaveBeenCalledTimes(1)
    const signal = mocks.toggleItemLikeMock.mock.calls[0][3] as AbortSignal
    expect(signal.aborted).toBe(false)

    unmount()
    expect(signal.aborted).toBe(true)

    resolveRequest?.({
      public_id: "dish-1",
      is_liked: true,
      likes_count: 1,
    })
  })
})
