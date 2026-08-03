import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n/config"
import { BookModal } from "./BookModal"

const bookStrings = {
  get modal() {
    return {
      flow: {
        get next() {
          return i18n.t("reservation.modal.flow.next")
        },
      },
      guestNamePlaceholder: i18n.t("reservation.modal.guestNamePlaceholder"),
      validation: {
        get guestNameRequired() {
          return i18n.t("reservation.modal.validation.guestNameRequired")
        },
      },
      actions: {
        get confirm() {
          return i18n.t("reservation.modal.actions.confirm")
        },
      },
    }
  },
}

// vi.mock's factory below is keyed by "2026-07-08" — it's hoisted above
// top-level consts, so it can't reference a shared variable. FIXED_DATE
// (used as the initialDate prop) must resolve to that same calendar date,
// or the modal's own dateKey won't match the mocked slots response.
vi.mock("./api", () => ({
  // 12:00, 12:30, 13:00, 13:30 -> covers the full 120-min default duration
  // starting at 12:00 (four 30-min slots), or getDurationError flags it as
  // partially unavailable regardless of the guest-name state under test.
  fetchAvailableSlots: vi
    .fn()
    .mockResolvedValue({ "2026-07-08": ["12:00", "12:30", "13:00", "13:30"] }),
  fetchRestaurantSettings: vi.fn().mockResolvedValue({ working_hours: null, timezone: null }),
  createReservation: vi.fn().mockResolvedValue({
    public_id: "res-1",
    table: "table-1",
    guest_count: 2,
    start_at: "2026-07-08T12:00:00.000Z",
    end_at: "2026-07-08T14:00:00.000Z",
    status: "pending",
  }),
}))

import { createReservation } from "./api"

// Not "today": must be a Date whose localDateKey is exactly "2026-07-08",
// matching the mocked fetchAvailableSlots response above.
const FIXED_DATE = new Date(2026, 6, 8)

const TABLE = { public_id: "table-1", public_number: "T1", capacity: 4 }
const WORKING_HOURS = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: { open: "10:00", close: "22:00" },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("BookModal staff guest-name requirement", () => {
  it("disables confirm and blocks submission when the staff flow's guest name is blank", async () => {
    render(
      <MemoryRouter>
        <BookModal
          table={TABLE}
          workingHours={WORKING_HOURS}
          showNameField
          initialDate={FIXED_DATE}
          initialTime="12:00"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole("button", { name: bookStrings.modal.flow.next })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(bookStrings.modal.guestNamePlaceholder),
      ).toBeInTheDocument(),
    )

    // Regression: the backend only routes to create_staff_reservation when
    // guest_name is truthy — leaving the name blank used to silently submit
    // anyway, booking the reservation under the WAITER's own account instead
    // of failing loudly or attributing it to the walk-in guest.
    expect(screen.getByText(bookStrings.modal.validation.guestNameRequired)).toBeInTheDocument()
    const nextBtn = screen.getByRole("button", { name: bookStrings.modal.flow.next })
    expect(nextBtn).toBeDisabled()
    fireEvent.click(nextBtn)
    expect(createReservation).not.toHaveBeenCalled()
  })

  it("allows submission once a guest name is entered in the staff flow", async () => {
    render(
      <MemoryRouter>
        <BookModal
          table={TABLE}
          workingHours={WORKING_HOURS}
          showNameField
          initialDate={FIXED_DATE}
          initialTime="12:00"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole("button", { name: bookStrings.modal.flow.next })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(bookStrings.modal.guestNamePlaceholder),
      ).toBeInTheDocument(),
    )
    fireEvent.change(screen.getByPlaceholderText(bookStrings.modal.guestNamePlaceholder), {
      target: { value: "Іван" },
    })

    expect(
      screen.queryByText(bookStrings.modal.validation.guestNameRequired),
    ).not.toBeInTheDocument()
    const nextBtn = screen.getByRole("button", { name: bookStrings.modal.flow.next })
    expect(nextBtn).toBeEnabled()
    fireEvent.click(nextBtn)
    const confirmBtn = screen.getByRole("button", { name: bookStrings.modal.actions.confirm })
    expect(confirmBtn).toBeEnabled()

    fireEvent.click(confirmBtn)
    await waitFor(() => expect(createReservation).toHaveBeenCalledTimes(1))
    expect(createReservation).toHaveBeenCalledWith(expect.objectContaining({ guest_name: "Іван" }))
  })

  it("does not require a name outside the staff flow (showNameField unset)", async () => {
    render(
      <MemoryRouter>
        <BookModal
          table={TABLE}
          workingHours={WORKING_HOURS}
          initialDate={FIXED_DATE}
          initialTime="12:00"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole("button", { name: bookStrings.modal.flow.next })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    fireEvent.click(screen.getByRole("button", { name: bookStrings.modal.flow.next }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: bookStrings.modal.actions.confirm })).toBeEnabled(),
    )
    expect(
      screen.queryByPlaceholderText(bookStrings.modal.guestNamePlaceholder),
    ).not.toBeInTheDocument()
  })
})
