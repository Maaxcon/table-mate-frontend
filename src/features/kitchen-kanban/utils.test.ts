import { describe, it, expect } from "vitest"
import { elapsedMinutes, mapItem, mapTicket, mapTicketShort } from "./utils"
import type { OrderItem, KitchenTicket } from "./api"

function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    public_id: "oi-1",
    restaurant: "r-1",
    order: "o-1",
    ticket: "t-1",
    menu_item: "mi-1",
    menu_item_name: "Burger",
    menu_item_category_id: null,
    menu_item_category_name: null,
    menu_item_category_color: "#F97316",
    guest_slot: 1,
    quantity: 2,
    comment: null,
    status: "pending",
    unit_price: "10.00",
    payable: "20.00",
    voided_by: "",
    void_reason: null,
    created_at: "2026-06-23T10:00:00Z",
    updated_at: "2026-06-23T10:00:00Z",
    ...overrides,
  }
}

function makeTicket(overrides: Partial<KitchenTicket> = {}): KitchenTicket {
  return {
    public_id: "t-1",
    restaurant: "r-1",
    session: "s-1",
    order: "o-1",
    status: "incoming",
    injected_at: "2026-06-23T10:00:00Z",
    started_at: null,
    completed_at: null,
    created_at: "2026-06-23T10:00:00Z",
    updated_at: "2026-06-23T10:00:00Z",
    label: "T1",
    daily_number: 1,
    table_number: "5",
    server_name: "Alice",
    guest_count: 3,
    items_count: 2,
    is_preorder: false,
    ...overrides,
  }
}

describe("mapItem", () => {
  it("maps ready status to ready", () => {
    const result = mapItem(makeOrderItem({ status: "ready" }))
    expect(result.status).toBe("ready")
    expect(result.name).toBe("Burger")
    expect(result.quantity).toBe(2)
    expect(result.id).toBe("oi-1")
  })

  it("maps pending status to pending", () => {
    expect(mapItem(makeOrderItem({ status: "pending" })).status).toBe("pending")
  })

  it("maps in_progress to pending", () => {
    expect(mapItem(makeOrderItem({ status: "in_progress" })).status).toBe("pending")
  })

  it("maps served to pending", () => {
    expect(mapItem(makeOrderItem({ status: "served" })).status).toBe("pending")
  })

  it("maps voided to pending", () => {
    expect(mapItem(makeOrderItem({ status: "voided" })).status).toBe("pending")
  })

  it("maps undefined status to pending", () => {
    expect(mapItem(makeOrderItem({ status: undefined })).status).toBe("pending")
  })

  it("includes comment as modifiers when present", () => {
    const result = mapItem(makeOrderItem({ comment: "No onions" }))
    expect(result.modifiers).toBe("No onions")
  })

  it("leaves modifiers undefined when comment is null", () => {
    const result = mapItem(makeOrderItem({ comment: null }))
    expect(result.modifiers).toBeUndefined()
  })

  it("passes empty string comment through as modifiers", () => {
    const result = mapItem(makeOrderItem({ comment: "" }))
    expect(result.modifiers).toBe("")
  })

  it("uses API provided category color when available", () => {
    const result = mapItem(
      makeOrderItem({ menu_item_category_name: "Салати", menu_item_category_color: "#22c55e" }),
    )
    expect(result.categoryName).toBe("Салати")
    expect(result.categoryColor).toBe("#22C55E")
  })

  it("falls back to the default colour when API returns null", () => {
    const result = mapItem(
      makeOrderItem({ menu_item_category_name: "Піца", menu_item_category_color: null }),
    )
    expect(result.categoryColor).toBe("#9CA3AF")
  })

  it("falls back to the default colour and undefined name for missing category data", () => {
    const result = mapItem(
      makeOrderItem({ menu_item_category_name: null, menu_item_category_color: undefined }),
    )
    expect(result.categoryName).toBeUndefined()
    expect(result.categoryColor).toBe("#9CA3AF")
  })
})

describe("mapTicket", () => {
  it("maps incoming ticket with startedAt from injected_at", () => {
    const ticket = makeTicket({ status: "incoming" })
    const items = [makeOrderItem({ ticket: "t-1" })]
    const result = mapTicket(ticket, items)
    expect(result.id).toBe("t-1")
    expect(result.status).toBe("incoming")
    expect(result.startedAt).toBe(new Date("2026-06-23T10:00:00Z").getTime())
    expect(result.guestCount).toBe(3)
    expect(result.serverName).toBe("Alice")
    expect(result.completedMinutes).toBeUndefined()
    expect(result.items).toHaveLength(1)
  })

  it("maps active ticket with startedAt from started_at", () => {
    const ticket = makeTicket({
      status: "active",
      started_at: "2026-06-23T10:05:00Z",
    })
    const result = mapTicket(ticket, [])
    expect(result.status).toBe("active")
    expect(result.startedAt).toBe(new Date("2026-06-23T10:05:00Z").getTime())
  })

  it("computes completedMinutes for completed tickets", () => {
    const ticket = makeTicket({
      status: "completed",
      started_at: "2026-06-23T10:00:00Z",
      completed_at: "2026-06-23T10:15:00Z",
    })
    const result = mapTicket(ticket, [])
    expect(result.completedMinutes).toBe(15)
  })

  it("leaves completedMinutes undefined when completed_at is null", () => {
    const ticket = makeTicket({
      status: "active",
      started_at: "2026-06-23T10:00:00Z",
      completed_at: null,
    })
    const result = mapTicket(ticket, [])
    expect(result.completedMinutes).toBeUndefined()
  })

  it("filters items by ticket public_id", () => {
    const items = [
      makeOrderItem({ public_id: "oi-1", ticket: "t-1" }),
      makeOrderItem({ public_id: "oi-2", ticket: "t-1" }),
      makeOrderItem({ public_id: "oi-3", ticket: "t-2" }),
    ]
    const ticket = makeTicket({ public_id: "t-1" })
    const result = mapTicket(ticket, items)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe("oi-1")
    expect(result.items[1].id).toBe("oi-2")
  })
})

describe("mapTicketShort", () => {
  it("creates completed ticket with no items", () => {
    const ticket = makeTicket({
      status: "completed",
      started_at: "2026-06-23T10:00:00Z",
      completed_at: "2026-06-23T10:20:00Z",
    })
    const result = mapTicketShort(ticket)
    expect(result.id).toBe("t-1")
    expect(result.status).toBe("completed")
    expect(result.items).toHaveLength(0)
    expect(result.completedMinutes).toBe(20)
  })

  it("falls back to injected_at when started_at is null", () => {
    const ticket = makeTicket({
      status: "completed",
      started_at: null,
      completed_at: "2026-06-23T10:30:00Z",
    })
    const result = mapTicketShort(ticket)
    expect(result.startedAt).toBe(new Date("2026-06-23T10:00:00Z").getTime())
    // completedMinutes requires both started_at and completed_at — null started_at means undefined
    expect(result.completedMinutes).toBeUndefined()
  })
})

describe("elapsedMinutes", () => {
  it("returns 0 for now", () => {
    expect(elapsedMinutes(Date.now())).toBe(0)
  })

  it("returns elapsed minutes", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    expect(elapsedMinutes(fiveMinAgo)).toBe(5)
  })
})
