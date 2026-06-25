import { describe, it, expect } from "vitest"
import { findFreePosition, CANVAS_W, CANVAS_H, GRID } from "./types"

const GRID_COLS = CANVAS_W / GRID // 20
const GRID_ROWS = CANVAS_H / GRID // 20

describe("findFreePosition", () => {
  it("returns the desired position unchanged when there is no overlap", () => {
    const desired = { x: 5, y: 5, w: 3, h: 3 }
    expect(findFreePosition(desired, [], GRID_COLS, GRID_ROWS)).toEqual({ x: 5, y: 5 })
  })

  it("preserves a non-colliding threshold sitting in the -1 overhang", () => {
    const desired = { x: -1, y: 4, w: 3, h: 1 }
    expect(findFreePosition(desired, [], GRID_COLS, GRID_ROWS)).toEqual({ x: -1, y: 4 })
  })

  it("keeps the resolved position on-canvas when colliding at the right edge", () => {
    // Desired sits flush against the right edge (right edge = 20) and overlaps an
    // existing entity, forcing the step search. With the old pixel bound (2000) the
    // search would happily step further right, off-canvas; with grid bounds it must
    // move left and stay within [0, GRID_COLS].
    const desired = { x: 17, y: 0, w: 3, h: 3 }
    const others = [{ x: 17, y: 0, w: 3, h: 3 }]

    const pos = findFreePosition(desired, others, GRID_COLS, GRID_ROWS)

    expect(pos.x).toBeGreaterThanOrEqual(0)
    expect(pos.y).toBeGreaterThanOrEqual(0)
    expect(pos.x + desired.w).toBeLessThanOrEqual(GRID_COLS)
    expect(pos.y + desired.h).toBeLessThanOrEqual(GRID_ROWS)
  })

  it("keeps the resolved position on-canvas when colliding at the bottom edge", () => {
    const desired = { x: 0, y: 17, w: 3, h: 3 }
    const others = [{ x: 0, y: 17, w: 3, h: 3 }]

    const pos = findFreePosition(desired, others, GRID_COLS, GRID_ROWS)

    expect(pos.y + desired.h).toBeLessThanOrEqual(GRID_ROWS)
    expect(pos.x + desired.w).toBeLessThanOrEqual(GRID_COLS)
  })
})
