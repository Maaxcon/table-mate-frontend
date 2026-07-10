import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ResizeHandles } from "./ResizeHandles"

describe("ResizeHandles", () => {
  it("rounds lock-aspect mid-edge move coordinates to integer grid units", () => {
    const onResize = vi.fn()
    const onMove = vi.fn()

    render(
      <div>
        <ResizeHandles
          entityId="table-1"
          entityType="table-round"
          entityX={5}
          entityY={5}
          entityW={3}
          entityH={3}
          entityRotation={0}
          onResize={onResize}
          onMove={onMove}
          scale={1}
          canvasCols={20}
          canvasRows={20}
        />
      </div>,
    )

    const eastHandle = screen.getByLabelText("Resize right")
    const parent = eastHandle.parentElement
    if (!parent) throw new Error("Resize handle parent missing")
    Object.defineProperty(parent, "offsetWidth", { configurable: true, value: 300 })
    Object.defineProperty(parent, "offsetHeight", { configurable: true, value: 300 })

    fireEvent.mouseDown(eastHandle, { clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 100, clientY: 0 })
    fireEvent.mouseUp(window)

    expect(onResize).toHaveBeenCalledWith("table-1", 4, 4)
    expect(onMove).toHaveBeenCalled()
    const lastMove = onMove.mock.calls.at(-1)
    expect(lastMove?.[0]).toBe("table-1")
    expect(lastMove?.[1]).toBe(5)
    expect(lastMove?.[2]).toBe(5)
    expect(Number.isInteger(lastMove?.[2])).toBe(true)
  })

  it("compensates position when resizing a rotated entity from a side handle", () => {
    const onResize = vi.fn()
    const onMove = vi.fn()

    render(
      <div>
        <ResizeHandles
          entityId="obstacle-1"
          entityType="obstacle"
          entityX={5}
          entityY={5}
          entityW={3}
          entityH={2}
          entityRotation={90}
          onResize={onResize}
          onMove={onMove}
          scale={1}
          canvasCols={20}
          canvasRows={20}
        />
      </div>,
    )

    const eastHandle = screen.getByLabelText("Resize right")
    const parent = eastHandle.parentElement
    if (!parent) throw new Error("Resize handle parent missing")
    Object.defineProperty(parent, "offsetWidth", { configurable: true, value: 300 })
    Object.defineProperty(parent, "offsetHeight", { configurable: true, value: 200 })

    fireEvent.mouseDown(eastHandle, { clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 0, clientY: 100 })
    fireEvent.mouseUp(window)

    expect(onResize).toHaveBeenCalledWith("obstacle-1", 4, 2)
    const lastMove = onMove.mock.calls.at(-1)
    expect(lastMove?.[0]).toBe("obstacle-1")
    // Without compensation this path kept (x,y) at (5,5), which drifts the opposite edge.
    expect(lastMove?.[1] === 5 && lastMove?.[2] === 5).toBe(false)
    expect(Number.isInteger(lastMove?.[1])).toBe(true)
    expect(Number.isInteger(lastMove?.[2])).toBe(true)
  })
})
