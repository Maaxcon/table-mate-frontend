function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso)
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

// Builds a minimal .ics for the booking and triggers a download, so the guest
// can drop the reservation straight into their calendar.
export function downloadReservationIcs(opts: {
  tableNumber: string
  startISO: string
  endISO: string
  guests: number
  summary: string
  guestsLabel: string
}): void {
  const { tableNumber, startISO, endISO, guests, summary, guestsLabel } = opts
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TableMate//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${tableNumber}@tablemate`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(startISO)}`,
    `DTEND:${toIcsUtc(endISO)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${guestsLabel}: ${guests}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `reservation-table-${tableNumber}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
