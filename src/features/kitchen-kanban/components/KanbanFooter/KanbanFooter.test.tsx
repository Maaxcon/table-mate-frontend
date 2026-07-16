import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { KanbanFooter } from "./KanbanFooter"
import i18n from "@/i18n/config"

describe("KanbanFooter", () => {
  it("renders all counts", () => {
    const incoming = i18n.t("admin.kitchen.footer.incoming")
    const active = i18n.t("admin.kitchen.footer.active")
    const completed = i18n.t("admin.kitchen.footer.completed")
    render(
      <KanbanFooter
        incomingCount={3}
        activeCount={5}
        completedCount={12}
        avgPrepTimeSeconds={null}
      />,
    )
    expect(screen.getByText(`${incoming}: 3`)).toBeInTheDocument()
    expect(screen.getByText(`${active}: 5`)).toBeInTheDocument()
    expect(screen.getByText(`${completed}: 12`)).toBeInTheDocument()
  })

  it("renders avg prep time in minutes", () => {
    const prepLabel = i18n.t("admin.kitchen.footer.prepTime")
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={900}
      />,
    )
    // 900 seconds = 15 minutes
    expect(screen.getByText(`${prepLabel}: 15m`)).toBeInTheDocument()
  })

  it("rounds avg prep time to nearest minute", () => {
    const prepLabel = i18n.t("admin.kitchen.footer.prepTime")
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={1250}
      />,
    )
    // 1250 seconds ≈ 20.83 minutes → rounds to 21
    expect(screen.getByText(`${prepLabel}: 21m`)).toBeInTheDocument()
  })

  it("renders em dash when avg prep time is null", () => {
    const prepLabel = i18n.t("admin.kitchen.footer.prepTime")
    render(
      <KanbanFooter
        incomingCount={0}
        activeCount={0}
        completedCount={0}
        avgPrepTimeSeconds={null}
      />,
    )
    expect(screen.getByText(`${prepLabel}: —`)).toBeInTheDocument()
  })
})
