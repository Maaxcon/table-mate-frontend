export function formatPrice(price: string): string {
  const num = parseFloat(price)
  return isNaN(num) ? price : num.toFixed(2)
}
