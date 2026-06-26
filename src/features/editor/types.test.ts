import { describe, it, expect } from "vitest"
import { findFreePosition, rotatedAABB, CANVAS_W, CANVAS_H, GRID } from "./types"

const GRID_COLS = CANVAS_W / GRID // 20
const GRID_ROWS = CANVAS_H / GRID // 20

describe("rotatedAABB", () => {
  it("returns original rect when rotation is 0", () => {
    expect(rotatedAABB(0, 0, 3, 1, 0)).toEqual({ x: 0, y: 0, w: 3, h: 1 })
  })

  it("returns original rect when rotation is undefined", () => {
    expect(rotatedAABB(10, 5, 3, 1)).toEqual({ x: 10, y: 5, w: 3, h: 1 })
  })

  it("swaps w and h at 90 degrees", () => {
    // 3×1 at (0,0) rotated 90° → AABB centered at (1.5, 0.5), size 1×3
    const result = rotatedAABB(0, 0, 3, 1, 90)
    expect(result.x).toBe(1)
    expect(result.y).toBe(-1)
    expect(result.w).toBe(1)
    expect(result.h).toBe(3)
  })

  it("computes correct envelope at 45 degrees", () => {
    const result = rotatedAABB(0, 0, 3, 1, 45)
    expect(result.w).toBeCloseTo(2.83, 1)
    expect(result.h).toBeCloseTo(2.83, 1)
  })

  it("handles 180 degrees same as 0", () => {
    expect(rotatedAABB(0, 0, 3, 1, 180)).toEqual({ x: 0, y: 0, w: 3, h: 1 })
  })

  it("handles 270 degrees same as 90", () => {
    const result = rotatedAABB(0, 0, 3, 1, 270)
    expect(result.x).toBe(1)
    expect(result.y).toBe(-1)
    expect(result.w).toBe(1)
    expect(result.h).toBe(3)
  })
})

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

  it("uses the rotated envelope for boundary checks", () => {
    // A 3x1 entity rotated 90° has envelope 1x3, so x=19 is valid
    const desired = { x: 19, y: 0, w: 3, h: 1, rotation: 90 }
    const pos = findFreePosition(desired, [], GRID_COLS, GRID_ROWS)
    expect(pos).toEqual({ x: 19, y: 0 })
  })

  it("uses the rotated envelope for collision checks", () => {
    // A 3x1 entity at x=5,y=0 rotated 90° has envelope 1x3 (occupies x:5..6, y:0..3)
    // A 1x3 entity at x=5,y=3 should NOT collide with it
    const desired = { x: 5, y: 3, w: 1, h: 3 }
    const others = [{ x: 5, y: 0, w: 3, h: 1, rotation: 90 }]
    const pos = findFreePosition(desired, others, GRID_COLS, GRID_ROWS)
    expect(pos).toEqual({ x: 5, y: 3 })
  })
})
