import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useEditorState, getNextTableLabel } from "./useEditorState"
import type { EditorEntity } from "@/features/editor/types"

describe("useEditorState — publishSuccess", () => {
  it("stays clean after publishing a newly created table (server id applied atomically)", () => {
    const { result } = renderHook(() => useEditorState())

    let tableId = ""
    act(() => {
      const entity = result.current.addEntity("table-square", 0, 0)
      tableId = entity!.id
    })

    // A freshly added table makes the editor dirty and has no server id yet.
    expect(result.current.dirty).toBe(true)
    expect(result.current.entities.find((e) => e.id === tableId)?.serverId).toBeUndefined()

    // Publish returns the server-assigned id for the new table.
    act(() => {
      result.current.publishSuccess({ [tableId]: "srv-123" })
    })

    // The id is applied and the editor is NOT left falsely dirty.
    const table = result.current.entities.find((e) => e.id === tableId)
    expect(table?.serverId).toBe("srv-123")
    expect(result.current.dirty).toBe(false)
  })

  it("stays clean after publishing with no newly created tables", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.addEntity("obstacle", 0, 0)
    })
    expect(result.current.dirty).toBe(true)

    act(() => {
      result.current.publishSuccess()
    })
    expect(result.current.dirty).toBe(false)
  })
})

describe("getNextTableLabel", () => {
  let nextId = 0
  const table = (overrides: Partial<EditorEntity> = {}): EditorEntity => ({
    id: overrides.id ?? `table-${nextId++}`,
    type: overrides.type ?? "table-square",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    w: overrides.w ?? 2,
    h: overrides.h ?? 2,
    label: overrides.label,
    zoneId: overrides.zoneId,
  })

  it("uses the highest numeric suffix across all zones", () => {
    const entities = [
      table({ label: "T3" }),
      table({ label: "T10" }),
      table({ label: "T2", zoneId: "other" }),
    ]
    expect(getNextTableLabel(entities)).toBe("T11")
  })

  it("treats backend numeric public numbers as part of the sequence", () => {
    const entities = [table({ label: "12" }), table({ label: "T5" })]
    expect(getNextTableLabel(entities)).toBe("T13")
  })
})

describe("useEditorState — undo/redo", () => {
  it("undoes and redoes entity creation", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.addEntity("table-square", 0, 0)
    })
    expect(result.current.entities).toHaveLength(1)
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo()
    })
    expect(result.current.entities).toHaveLength(0)
    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.redo()
    })
    expect(result.current.entities).toHaveLength(1)
  })

  it("clears redo stack after a new edit", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.addEntity("table-square", 0, 0)
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.addEntity("obstacle", 2, 2)
    })
    expect(result.current.canRedo).toBe(false)
  })

  it("moves selected block as one undoable action", () => {
    const { result } = renderHook(() => useEditorState())

    let firstId = ""
    let secondId = ""
    act(() => {
      firstId = result.current.addEntity("table-square", 0, 0)!.id
      secondId = result.current.addEntity("table-square", 4, 4)!.id
    })

    act(() => {
      result.current.moveEntitiesByDelta([firstId, secondId], 2, 1)
    })

    const movedFirst = result.current.entities.find((entity) => entity.id === firstId)
    const movedSecond = result.current.entities.find((entity) => entity.id === secondId)
    expect(movedFirst?.x).toBe(2)
    expect(movedFirst?.y).toBe(1)
    expect(movedSecond?.x).toBe(6)
    expect(movedSecond?.y).toBe(5)

    act(() => {
      result.current.undo()
    })

    const originalFirst = result.current.entities.find((entity) => entity.id === firstId)
    const originalSecond = result.current.entities.find((entity) => entity.id === secondId)
    expect(originalFirst?.x).toBe(0)
    expect(originalFirst?.y).toBe(0)
    expect(originalSecond?.x).toBe(4)
    expect(originalSecond?.y).toBe(4)
  })

  it("applies one shared clamp delta for multi-select moves", () => {
    const { result } = renderHook(() => useEditorState())

    let leftId = ""
    let rightId = ""
    act(() => {
      leftId = result.current.addEntity("table-square", 1, 1)!.id
      rightId = result.current.addEntity("table-square", 10, 1)!.id
    })

    // Attempt to drag far left: the left table hits boundary first, so the
    // whole group should move by -1 (not collapse spacing).
    act(() => {
      result.current.moveEntitiesByDelta([leftId, rightId], -5, 0)
    })

    const afterLeft = result.current.entities.find((entity) => entity.id === leftId)
    const afterRight = result.current.entities.find((entity) => entity.id === rightId)
    expect(afterLeft?.x).toBe(0)
    expect(afterRight?.x).toBe(9)

    // Drag back by +1 and ensure original spacing/positions are restored.
    act(() => {
      result.current.moveEntitiesByDelta([leftId, rightId], 1, 0)
    })

    const restoredLeft = result.current.entities.find((entity) => entity.id === leftId)
    const restoredRight = result.current.entities.find((entity) => entity.id === rightId)
    expect(restoredLeft?.x).toBe(1)
    expect(restoredRight?.x).toBe(10)
  })

  it("respects backend coordinate limits during multi-move", () => {
    const { result } = renderHook(() => useEditorState())

    let obstacleId = ""
    let portalId = ""
    act(() => {
      obstacleId = result.current.addEntity("obstacle", 0, 0)!.id
      portalId = result.current.addEntity("portal", 0, 5)!.id
      result.current.updateEntity(obstacleId, { w: 1 })
    })

    act(() => {
      result.current.moveEntitiesByDelta([obstacleId, portalId], 10_000, 0)
    })

    const movedObstacle = result.current.entities.find((entity) => entity.id === obstacleId)
    expect(movedObstacle?.x).toBe(result.current.canvasCols - 2)
  })

  it("adds multiple entities as one undoable action", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.addEntities([
        { id: "a", type: "table-square", x: 0, y: 0, w: 2, h: 2, rotation: 0 },
        { id: "b", type: "table-square", x: 4, y: 0, w: 2, h: 2, rotation: 0 },
      ])
    })
    expect(result.current.entities).toHaveLength(2)

    act(() => {
      result.current.undo()
    })
    expect(result.current.entities).toHaveLength(0)
  })

  it("removes multiple entities as one undoable action", () => {
    const { result } = renderHook(() => useEditorState())

    let firstId = ""
    let secondId = ""
    act(() => {
      firstId = result.current.addEntity("table-square", 0, 0)!.id
      secondId = result.current.addEntity("table-square", 4, 0)!.id
    })
    expect(result.current.entities).toHaveLength(2)

    act(() => {
      result.current.removeEntities([firstId, secondId])
    })
    expect(result.current.entities).toHaveLength(0)

    act(() => {
      result.current.undo()
    })
    expect(result.current.entities).toHaveLength(2)
    expect(result.current.entities.some((entity) => entity.id === firstId)).toBe(true)
    expect(result.current.entities.some((entity) => entity.id === secondId)).toBe(true)
  })
})
