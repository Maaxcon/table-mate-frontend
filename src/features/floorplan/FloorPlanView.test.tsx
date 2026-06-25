import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FloorPlanView, type FloorPlanTableRef } from "./FloorPlanView"
import { GRID, type LayoutPayload } from "@/features/editor/types"

const px = (v: number) => v * GRID

function tableEntry(o: {
  id: string
  number: string
  zone: string
  rotation?: number
}): LayoutPayload["tables"][number] {
  return {
    id: o.id,
    public_number: o.number,
    x: px(1),
    y: px(1),
    width: px(2),
    height: px(2),
    rotation: o.rotation ?? 0,
    shape: "square",
    capacity: 4,
    zone_id: o.zone,
    tags: [],
  }
}

function portalEntry(o: {
  zone: string
  target: string
  label: string
}): LayoutPayload["portals"][number] {
  return {
    x: px(0),
    y: px(0),
    width: px(2),
    height: px(2),
    rotation: 0,
    target_zone_id: o.target,
    label: o.label,
    portal_label: o.label,
    zone_id: o.zone,
  }
}

function makePayload(over: Partial<LayoutPayload> = {}): LayoutPayload {
  return { tables: [], obstacles: [], thresholds: [], portals: [], ...over }
}

describe("FloorPlanView", () => {
  it("shows the empty message when there is no payload", () => {
    render(<FloorPlanView payload={null} emptyMessage="Nothing here" />)
    expect(screen.getByText("Nothing here")).toBeInTheDocument()
  })

  it("renders a tile per table", () => {
    const payload = makePayload({
      tables: [
        tableEntry({ id: "t1", number: "1", zone: "A" }),
        tableEntry({ id: "t2", number: "2", zone: "A" }),
      ],
    })
    render(<FloorPlanView payload={payload} />)
    expect(screen.getByRole("button", { name: "Table 1, free" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Table 2, free" })).toBeInTheDocument()
  })

  it("filters tiles to the selected zone", () => {
    const payload = makePayload({
      tables: [
        tableEntry({ id: "t1", number: "1", zone: "A" }),
        tableEntry({ id: "t2", number: "2", zone: "B" }),
      ],
    })
    render(<FloorPlanView payload={payload} selectedZoneId="A" />)
    expect(screen.getByRole("button", { name: "Table 1, free" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Table 2, free" })).not.toBeInTheDocument()
  })

  it("reflects the resolved status via tableStatus", () => {
    const payload = makePayload({ tables: [tableEntry({ id: "t1", number: "1", zone: "A" })] })
    const tableStatus = () => "occupied" as const
    render(<FloorPlanView payload={payload} tableStatus={tableStatus} />)
    expect(screen.getByRole("button", { name: "Table 1, occupied" })).toBeInTheDocument()
  })

  it("calls onTableSelect with the table ref when a tile is clicked", async () => {
    const payload = makePayload({ tables: [tableEntry({ id: "t1", number: "1", zone: "A" })] })
    const onTableSelect = vi.fn<(t: FloorPlanTableRef) => void>()
    render(<FloorPlanView payload={payload} onTableSelect={onTableSelect} />)
    await userEvent.click(screen.getByRole("button", { name: "Table 1, free" }))
    expect(onTableSelect).toHaveBeenCalledTimes(1)
    expect(onTableSelect.mock.calls[0][0].id).toBe("t1")
  })

  it("calls onPortalNavigate with the target zone when a portal is clicked", async () => {
    const payload = makePayload({
      portals: [portalEntry({ zone: "A", target: "B", label: "Patio" })],
    })
    const onPortalNavigate = vi.fn<(zoneId: string) => void>()
    render(<FloorPlanView payload={payload} onPortalNavigate={onPortalNavigate} />)
    await userEvent.click(screen.getByRole("button", { name: "Go to Patio" }))
    expect(onPortalNavigate).toHaveBeenCalledWith("B")
  })

  it("applies a rotation transform to a rotated entity", () => {
    const payload = makePayload({
      tables: [tableEntry({ id: "t1", number: "1", zone: "A", rotation: 90 })],
    })
    render(<FloorPlanView payload={payload} />)
    const tile = screen.getByRole("button", { name: "Table 1, free" })
    expect(tile.style.transform).toContain("rotate(90deg)")
  })
})
