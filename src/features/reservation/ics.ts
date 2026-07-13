import { downloadBlob } from "@/utils/downloadBlob"

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

// RFC 5545 §3.3.11 TEXT escaping. Backslash, comma and semicolon are
// structural in an iCalendar TEXT value (comma/semicolon separate list
// items and parameters) — a raw one in a table label or guest count string
// (e.g. "Зала А, столик 2") truncates or reinterprets the field, and some
// calendar clients reject the whole file rather than degrade gracefully.
// Order matters: backslashes must be escaped first, or the backslashes the
// other three replacements introduce would themselves get doubled.
function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

// RFC 5545 §3.1 content-line folding: a line over 75 octets is split, with each
// continuation prefixed by a single space. Measured in UTF-8 octets, not chars,
// and never split mid-character — a Cyrillic label (2 bytes/char) would
// otherwise corrupt, and some clients reject the file over an over-long line.
function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const chunks: string[] = []
  let current = ""
  let currentBytes = 0
  for (const ch of line) {
    const chBytes = new TextEncoder().encode(ch).length
    // First line caps at 75; continuations at 74 (the leading space counts).
    const limit = chunks.length === 0 ? 75 : 74
    if (currentBytes + chBytes > limit) {
      chunks.push(current)
      current = ""
      currentBytes = 0
    }
    current += ch
    currentBytes += chBytes
  }
  chunks.push(current)
  return chunks.join("\r\n ")
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
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(`${guestsLabel}: ${guests}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  const blob = new Blob([lines.map(foldIcsLine).join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  })
  downloadBlob(blob, `reservation-table-${tableNumber}.ics`)
}
