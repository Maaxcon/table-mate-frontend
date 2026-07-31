import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LayoutPayload } from "@/features/editor/types"
import type { Table, Zone } from "@/types/api/types.gen"
import { CustomerFloorPlan } from "./CustomerFloorPlan"

// Satisfies both the generated Zone (via Table.zone) and the feature-level
// Zone used by the zones prop, which requires sort_order.
type ZoneFixture = Omit<Zone, "sort_order" | "edge_styles"> & {
  sort_order: number
  edge_styles?: Record<string, "dashed" | "solid">
}

function makeZone(id: string, name: string): ZoneFixture {
  return {
    public_id: id,
    name,
    sort_order: 0,
    canvas_cols: 20,
    canvas_rows: 20,
    _lang: "uk",
    _is_fallback: false,
    translations: [],
  }
}

function makeTable(overrides: Partial<Table>): Table {
  const zone = overrides.zone ?? makeZone("main", "Main")

  return {
    public_id: "table-id",
    restaurant: "restaurant-id",
    public_number: "T1",
    capacity: 4,
    is_occupied: false,
    active: true,
    zone,
    _lang: null,
    _is_fallback: false,
    translations: [],
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

  it("shows the selected ring on a tile matched only via the stale-id public-number fallback", () => {
    // Regression: the ring used to compare selectedId against the layout
    // entity's raw serverId ("stale-id" here), which never matches once the
    // table's real public_id ("summer-table") has moved on — even though
    // the tile is still the one a click resolves to and books via the same
    // public_number fallback. A stale-serverId tile could be clicked/booked
    // but would render with no visible selection at all.
    const main = makeZone("main", "Main")
    const summer = makeZone("summer", "Summer VIbe")
    const tables = [
      makeTable({ public_id: "main-table", capacity: 4, zone: main }),
      makeTable({ public_id: "summer-table", capacity: 8, zone: summer }),
    ]

    render(
      <CustomerFloorPlan
        tables={tables}
        zones={[main, summer]}
        selectedZone="summer"
        onZoneChange={vi.fn()}
        selectedId="summer-table"
        onSelect={vi.fn()}
        payload={makePayload({ id: "stale-id", public_number: "T1", zone_id: "summer" })}
      />,
    )

    const tile = screen.getByRole("button", { name: "Стіл T1, 8 місць, Вільно" })
    expect(tile.className).toContain("c-floor-plan__table--selected")
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

    const tile = screen.getByRole("button", { name: "Стіл T7, 6 місць, Вільно" })
    expect(tile).toBeDisabled()
    // Capacity shows as the seats chip (people icon + number) — from the layout (6),
    // never a 0 placeholder when no live table matches.
    expect(tile).toHaveTextContent("6")
    expect(tile).not.toHaveTextContent("0")
  })

  it("synthesizes a grid-aligned, non-overlapping layout when no layout is published", () => {
    const main = makeZone("main", "Main")
    const tables = [
      makeTable({ public_id: "t1", public_number: "T1", capacity: 4, zone: main }),
      makeTable({ public_id: "t2", public_number: "T2", capacity: 2, zone: main }),
    ]

    render(
      <CustomerFloorPlan
        tables={tables}
        zones={[main]}
        selectedZone="main"
        onZoneChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
        payload={null}
      />,
    )

    const tile1 = screen.getByRole("button", { name: "Стіл T1, 4 місця, Вільно" })
    const tile2 = screen.getByRole("button", { name: "Стіл T2, 2 місця, Вільно" })

    // GRID = 100 — every synthesized position must be an exact multiple, or
    // deserializeLayout's Math.round(x / GRID) rounding would silently shift it.
    for (const tile of [tile1, tile2]) {
      expect(parseFloat(tile.style.left) % 100).toBe(0)
      expect(parseFloat(tile.style.top) % 100).toBe(0)
    }
    // Not stacked on top of each other.
    expect(tile1.style.left !== tile2.style.left || tile1.style.top !== tile2.style.top).toBe(true)
  })
})
