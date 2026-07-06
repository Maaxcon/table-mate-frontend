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
