import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ActiveColumn } from "./ActiveColumn"
import type { KanbanTicket } from "../types"

function makeTicket(overrides: Partial<KanbanTicket> = {}): KanbanTicket {
  return {
    id: "t-1",
    label: "T1",
    status: "active",
    items: [
      { id: "i-1", name: "Burger", quantity: 2, status: "pending" },
      { id: "i-2", name: "Fries", quantity: 1, status: "ready" },
    ],
    startedAt: Date.now() - 5 * 60 * 1000,
    guestCount: 3,
    serverName: "Alice",
    ...overrides,
  }
}

describe("ActiveColumn", () => {
  it("renders ticket items with quantities", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    expect(screen.getByText(/2X Burger/)).toBeInTheDocument()
    expect(screen.getByText(/1X Fries/)).toBeInTheDocument()
  })

  it("renders empty state when no tickets", () => {
    render(<ActiveColumn tickets={[]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />)
    expect(screen.getByText("No active orders")).toBeInTheDocument()
  })

  it("sets aria-pressed on ready items", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    const buttons = screen.getAllByRole("button", { pressed: true })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent(/Fries/)
  })

  it("does not set aria-pressed on pending items", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    const buttons = screen.getAllByRole("button", { pressed: false })
    // the button without pressed includes both the Burger item button and the bump button
    const burgerButton = buttons.find((b) => b.textContent?.includes("Burger"))
    expect(burgerButton).toBeTruthy()
  })

  it("disables bump button when not all items are ready", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    const bump = screen.getByRole("button", { name: "Complete order" })
    expect(bump).toBeDisabled()
  })

  it("enables bump button when all items are ready", () => {
    const ticket = makeTicket({
      items: [
        { id: "i-1", name: "Burger", quantity: 2, status: "ready" },
        { id: "i-2", name: "Fries", quantity: 1, status: "ready" },
      ],
    })
    render(<ActiveColumn tickets={[ticket]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />)
    const bump = screen.getByRole("button", { name: "Complete order" })
    expect(bump).toBeEnabled()
  })

  it("renders checkmark SVG when all items are ready", () => {
    const ticket = makeTicket({
      items: [{ id: "i-1", name: "Burger", quantity: 2, status: "ready" }],
    })
    render(<ActiveColumn tickets={[ticket]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />)
    const bump = screen.getByRole("button", { name: "Complete order" })
    expect(bump.innerHTML).toContain("<polyline")
  })

  it("shows BUMP text when not all items are ready", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    expect(screen.getByText("BUMP")).toBeInTheDocument()
  })

  it("renders modifier text when present", () => {
    const ticket = makeTicket({
      items: [
        { id: "i-1", name: "Burger", quantity: 1, status: "pending", modifiers: "No onions" },
      ],
    })
    render(<ActiveColumn tickets={[ticket]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />)
    expect(screen.getByText("(No onions)")).toBeInTheDocument()
  })

  it("renders guest count and server name", () => {
    render(
      <ActiveColumn tickets={[makeTicket()]} onToggleItem={vi.fn()} onBump={vi.fn()} canManage />,
    )
    expect(screen.getByText("G: 3")).toBeInTheDocument()
    expect(screen.getByText("SERVER: ALICE")).toBeInTheDocument()
  })
})
