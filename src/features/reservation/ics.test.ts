import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { downloadReservationIcs } from "./ics"

let capturedBlob: Blob | null = null

beforeEach(() => {
  capturedBlob = null
  vi.spyOn(URL, "createObjectURL").mockImplementation((obj: Blob | MediaSource) => {
    capturedBlob = obj as Blob
    return "blob:mock"
  })
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("downloadReservationIcs", () => {
  it("escapes commas and semicolons in SUMMARY/DESCRIPTION per RFC 5545", async () => {
    downloadReservationIcs({
      tableNumber: "T1",
      startISO: "2026-07-08T12:00:00.000Z",
      endISO: "2026-07-08T14:00:00.000Z",
      guests: 2,
      // A table label an admin could plausibly set — comma and semicolon
      // are structural in iCalendar TEXT values, so a raw one here used to
      // truncate/corrupt the field instead of just showing as punctuation.
      summary: "Бронь столу Зала А, столик 2; тераса",
      guestsLabel: "Гостей",
    })

    expect(capturedBlob).not.toBeNull()
    const text = await capturedBlob!.text()

    expect(text).toContain("SUMMARY:Бронь столу Зала А\\, столик 2\\; тераса")
    // The raw (unescaped) form must not appear anywhere in the file.
    expect(text).not.toContain("SUMMARY:Бронь столу Зала А, столик 2; тераса")
  })

  it("escapes a backslash before the other escapes so it isn't double-escaped", async () => {
    downloadReservationIcs({
      tableNumber: "T1",
      startISO: "2026-07-08T12:00:00.000Z",
      endISO: "2026-07-08T14:00:00.000Z",
      guests: 2,
      summary: "Back\\slash, and comma",
      guestsLabel: "Гостей",
    })

    const text = await capturedBlob!.text()
    expect(text).toContain("SUMMARY:Back\\\\slash\\, and comma")
  })

  it("leaves an ordinary label with no special characters unchanged", async () => {
    downloadReservationIcs({
      tableNumber: "T1",
      startISO: "2026-07-08T12:00:00.000Z",
      endISO: "2026-07-08T14:00:00.000Z",
      guests: 4,
      summary: "Бронь столу T1",
      guestsLabel: "Гостей",
    })

    const text = await capturedBlob!.text()
    expect(text).toContain("SUMMARY:Бронь столу T1")
    expect(text).toContain("DESCRIPTION:Гостей: 4")
  })
})
