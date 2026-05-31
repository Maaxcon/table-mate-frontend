import { jsPDF } from "jspdf"
import { loadReceiptFont } from "./receiptFont"
import type { HistoryEntry } from "./types"
import { formatDateTime, formatMoney } from "./utils"

const FONT = "DejaVuSans"

// Same money format as the screen (DejaVu Sans renders $, €, £, ₴).
const money = formatMoney

// Build a clean, text-based PDF of a receipt and return it as a Blob.
export async function buildReceiptPdf(
  entry: HistoryEntry,
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({ unit: "mm", format: "a5" })

  // Embed a Cyrillic-capable font so Ukrainian text renders correctly.
  const { regular, bold } = await loadReceiptFont()
  doc.addFileToVFS("DejaVuSans.ttf", regular)
  doc.addFont("DejaVuSans.ttf", FONT, "normal")
  doc.addFileToVFS("DejaVuSans-Bold.ttf", bold)
  doc.addFont("DejaVuSans-Bold.ttf", FONT, "bold")

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 16
  const right = pageW - 16
  const mid = pageW / 2
  const lh = 5.5 // line height
  let y = 20

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 16) {
      doc.addPage()
      y = 20
    }
  }
  const rule = () => {
    doc.setDrawColor(214)
    doc.setLineWidth(0.2)
    doc.line(left, y, right, y)
    y += 6
  }
  const pair = (label: string, value: string) => {
    doc.setTextColor(125)
    doc.text(label, left, y)
    doc.setTextColor(25)
    doc.text(value, right, y, { align: "right" })
    y += lh
  }

  // Brand
  doc.setFont(FONT, "bold")
  doc.setFontSize(17)
  doc.setTextColor(20)
  doc.text(entry.restaurantName, mid, y, { align: "center" })
  y += 7
  doc.setFont(FONT, "normal")
  doc.setFontSize(9)
  doc.setTextColor(125)
  for (const line of doc.splitTextToSize(entry.restaurantAddress, right - left) as string[]) {
    doc.text(line, mid, y, { align: "center" })
    y += 4.2
  }
  doc.text(entry.restaurantPhone, mid, y, { align: "center" })
  y += 7
  rule()

  // Meta
  doc.setFontSize(10)
  pair("Receipt", entry.orderNumber)
  pair("Date", formatDateTime(entry.date))
  pair("Table", entry.tableLabel || "-")
  pair("Server", entry.server || "-")
  pair("Guests", String(entry.guests))
  y += 1
  rule()

  // Items — wrap long names so they never collide with the price column.
  doc.setFontSize(10)
  const priceColW = 26
  const nameMaxW = right - left - priceColW
  for (const item of entry.items) {
    const label = `${item.quantity} x ${item.name}`
    const lines = doc.splitTextToSize(label, nameMaxW) as string[]
    ensureSpace(lines.length * lh)
    doc.setTextColor(25)
    doc.text(lines, left, y)
    doc.text(money(item.unitPrice * item.quantity, entry.currency), right, y, { align: "right" })
    y += lines.length * lh
  }
  y += 1
  rule()

  // Totals
  doc.setFontSize(10)
  pair("Subtotal", money(entry.subtotal, entry.currency))
  pair("Tax", money(entry.tax, entry.currency))
  pair("Service charge", money(entry.serviceCharge, entry.currency))
  pair("Tip", money(entry.tip, entry.currency))
  y += 2
  doc.setDrawColor(40)
  doc.setLineWidth(0.4)
  doc.line(left, y, right, y)
  y += 6
  doc.setFont(FONT, "bold")
  doc.setFontSize(14)
  doc.setTextColor(20)
  doc.text("Total", left, y)
  doc.text(money(entry.total, entry.currency), right, y, { align: "right" })
  y += 10

  // Payment + footer
  doc.setFont(FONT, "normal")
  doc.setFontSize(10)
  doc.setTextColor(25)
  const method = entry.paymentMethod === "card" ? "Card" : "Cash"
  doc.text(`Payment: ${method}`, left, y)
  doc.text(entry.paymentStatus, right, y, { align: "right" })
  y += 11
  doc.setTextColor(150)
  doc.setFontSize(9)
  doc.text("Thank you for dining with us!", mid, y, { align: "center" })

  return { blob: doc.output("blob"), filename: `receipt-${entry.orderNumber}.pdf` }
}
