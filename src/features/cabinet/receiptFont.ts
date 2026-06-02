// Loads the receipt PDF font (DejaVu Sans, which supports Cyrillic) once and
// caches it as base64 so jsPDF can embed it. Files live in /public/fonts.

type ReceiptFont = { regular: string; bold: string }

let fontPromise: Promise<ReceiptFont> | null = null

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load font ${url}: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Cached: subsequent calls reuse the same in-flight/finished promise.
export function loadReceiptFont(): Promise<ReceiptFont> {
  if (!fontPromise) {
    fontPromise = Promise.all([
      fetchAsBase64("/fonts/DejaVuSans.ttf"),
      fetchAsBase64("/fonts/DejaVuSans-Bold.ttf"),
    ])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((err) => {
        // Reset so a later attempt can retry.
        fontPromise = null
        throw err
      })
  }
  return fontPromise
}
