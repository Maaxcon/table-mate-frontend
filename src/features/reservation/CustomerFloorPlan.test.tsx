import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LayoutPayload } from "@/features/editor/types"
import type { Table } from "@/types/api/types.gen"
import type { Zone } from "./api"
import { CustomerFloorPlan } from "./CustomerFloorPlan"

function makeZone(id: string, name: string): Zone {
  return {
    public_id: id,
    name,
    sort_order: 0,
    canvas_cols: 20,
    canvas_rows: 20,
  }
}

function makeTable(overrides: Partial<Table>): Table {
  const zone = overrides.zone ?? {
    public_id: "main",
    name: "Main",
    sort_order: 0,
  }

  return {
    public_id: "table-id",
    restaurant: "restaurant-id",
    public_number: "T1",
    capacity: 4,
    is_occupied: false,
    active: true,
    zone,
    created_at: "2026-07-02T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  }
}

function makePayload(table: Partial<LayoutPayload["tables"][number]>): LayoutPayload {
  return {
    tables: [
      {
        id: "layout-table-id",
        public_number: "T1",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        shape: "square",
        capacity: 6,
        zone_id: "summer",
        tags: [],
        ...table,
      },
    ],
    obstacles: [],
    thresholds: [],
    portals: [],
  }
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe("CustomerFloorPlan", () => {
  it("matches stale layout ids by public number within the same zone", () => {
    const main = makeZone("main", "Main")
    const summer = makeZone("summer", "Summer VIbe")
    const tables = [
      makeTable({
        public_id: "main-table",
        capacity: 4,
        zone: main,
      }),
      makeTable({
        public_id: "summer-table",
        capacity: 8,
        zone: summer,
      }),
    ]

    render(
      <CustomerFloorPlan
        tables={tables}
        zones={[main, summer]}
        selectedZone="summer"
        onZoneChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
        payload={makePayload({ id: "stale-id", public_number: "T1", zone_id: "summer" })}
      />,
    )

    expect(screen.getByRole("button", { name: "Стіл T1, 8 місць, Вільно" })).toBeEnabled()
    expect(screen.queryByText("4 міс.")).not.toBeInTheDocument()
  })

  it("uses layout capacity when a live table cannot be matched", () => {
    const summer = makeZone("summer", "Summer VIbe")

    render(
      <CustomerFloorPlan
        tables={[]}
        zones={[summer]}
        selectedZone="summer"
        onZoneChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
        payload={makePayload({ public_number: "T7", capacity: 6, zone_id: "summer" })}
      />,
    )

    expect(screen.getByRole("button", { name: "Стіл T7, 6 місць, Вільно" })).toBeDisabled()
    expect(screen.getByText("6 міс.")).toBeInTheDocument()
    expect(screen.queryByText("0 міс.")).not.toBeInTheDocument()
  })
})
