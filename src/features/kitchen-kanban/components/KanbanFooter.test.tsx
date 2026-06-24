import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { KanbanFooter } from "./KanbanFooter"

describe("KanbanFooter", () => {
  it("renders all counts", () => {
    render(
      <KanbanFooter
        incomingCount={3}
        activeCount={5}
        completedCount={12}
        avgPrepTimeSeconds={null}
      />,
    )
    expect(screen.getByText("INCOMING: 3")).toBeInTheDocument()
    expect(screen.getByText("ACTIVE: 5")).toBeInTheDocument()
    expect(screen.getByText("COMPLETED (TODAY): 12")).toBeInTheDocument()
  })

  it("renders avg prep time in minutes", () => {
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={900}
      />,
    )
    // 900 seconds = 15 minutes
    expect(screen.getByText("AVG PREP TIME: 15m")).toBeInTheDocument()
  })

  it("rounds avg prep time to nearest minute", () => {
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={1250}
      />,
    )
    // 1250 seconds ≈ 20.83 minutes → rounds to 21
    expect(screen.getByText("AVG PREP TIME: 21m")).toBeInTheDocument()
  })

  it("renders em dash when avg prep time is null", () => {
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={null}
      />,
    )
    expect(screen.getByText("AVG PREP TIME: —")).toBeInTheDocument()
  })
})
