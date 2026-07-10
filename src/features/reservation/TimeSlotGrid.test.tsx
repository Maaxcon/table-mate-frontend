import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TimeSlotGrid } from "./TimeSlotGrid"

describe("TimeSlotGrid", () => {
  it("renders available, selected and disabled chips", () => {
    const onSelect = vi.fn()
    render(
      <TimeSlotGrid
        slots={["18:00", "18:30", "19:00"]}
        selectedTime="18:30"
        disabledSlots={["19:00"]}
        onSelect={onSelect}
      />,
    )

    const available = screen.getByRole("button", { name: "18:00" })
    const selected = screen.getByRole("button", { name: "18:30" })
    const disabled = screen.getByRole("button", { name: "19:00" })

    expect(available).toBeEnabled()
    expect(selected).toBeEnabled()
    expect(selected).toHaveAttribute("aria-pressed", "true")
    expect(disabled).toBeDisabled()

    fireEvent.click(available)
    fireEvent.click(disabled)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith("18:00")
  })
})
