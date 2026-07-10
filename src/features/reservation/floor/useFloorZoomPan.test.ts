import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useFloorZoomPan } from "./useFloorZoomPan"

describe("useFloorZoomPan", () => {
  it("starts at zoom=1 (FloorPlanView's own fit, no extra scale)", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    expect(result.current.scale).toBe(1)
    expect(result.current.pan).toEqual({ x: 0, y: 0 })
  })

  it("zoomIn/zoomOut multiply within [1, 4]", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    act(() => result.current.zoomIn())
    expect(result.current.scale).toBeCloseTo(1.25)
    act(() => {
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
      result.current.zoomIn()
    })
    expect(result.current.scale).toBeLessThanOrEqual(4)

    act(() => result.current.zoomOut())
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomOut()
    })
    expect(result.current.scale).toBe(1)
  })

  it("zoomFit resets both zoom and pan", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    act(() => {
      result.current.zoomIn()
      result.current.zoomIn()
    })
    expect(result.current.scale).toBeGreaterThan(1)

    act(() => result.current.zoomFit())
    expect(result.current.scale).toBe(1)
    expect(result.current.pan).toEqual({ x: 0, y: 0 })
  })

  it("clamps pan to zero range at zoom=1 (nothing to pan into)", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    const handlers = result.current.panHandlers
    act(() => {
      handlers.onPointerDown({
        pointerType: "mouse",
        clientX: 100,
        clientY: 100,
      } as React.PointerEvent<HTMLDivElement>)
      handlers.onPointerMove({
        pointerType: "mouse",
        clientX: 150,
        clientY: 130,
      } as React.PointerEvent<HTMLDivElement>)
    })
    // At zoom=1 there's no extra content to pan into — maxPan is 0.
    expect(result.current.pan).toEqual({ x: 0, y: 0 })
  })

  it("re-clamps pan to the shrinking bounds on zoom out (no off-screen leftover)", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    act(() => {
      for (let i = 0; i < 8; i++) result.current.zoomIn()
    })
    expect(result.current.scale).toBe(4)

    // Drag hard into a corner: pan clamps to the 4x bound, (4-1)*400/2 = 600.
    act(() => {
      result.current.panHandlers.onPointerDown({
        pointerType: "mouse",
        clientX: 0,
        clientY: 0,
      } as React.PointerEvent<HTMLDivElement>)
      result.current.panHandlers.onPointerMove({
        pointerType: "mouse",
        clientX: 900,
        clientY: 900,
      } as React.PointerEvent<HTMLDivElement>)
      result.current.panHandlers.onPointerUp()
    })
    expect(result.current.pan).toEqual({ x: 600, y: 600 })

    // Each zoom-out step must pull pan back inside the new, smaller bound —
    // a stale corner offset at a lower zoom would push the floor off-screen.
    act(() => result.current.zoomOut())
    const bound = ((result.current.scale - 1) * 400) / 2
    expect(result.current.pan.x).toBeLessThanOrEqual(bound)
    expect(result.current.pan.y).toBeLessThanOrEqual(bound)

    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomOut()
    })
    expect(result.current.scale).toBe(1)
    expect(result.current.pan).toEqual({ x: 0, y: 0 })
  })

  it("a small pointer move below the drag threshold does not flip didPanRef", () => {
    const { result } = renderHook(() => useFloorZoomPan(400, 400))
    const handlers = result.current.panHandlers
    act(() => {
      handlers.onPointerDown({
        pointerType: "mouse",
        clientX: 100,
        clientY: 100,
      } as React.PointerEvent<HTMLDivElement>)
      handlers.onPointerMove({
        pointerType: "mouse",
        clientX: 102,
        clientY: 101,
      } as React.PointerEvent<HTMLDivElement>)
    })
    expect(result.current.didPanRef.current).toBe(false)
  })
})
