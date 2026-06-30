import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useEditorState } from "./useEditorState"

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
