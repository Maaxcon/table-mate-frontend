export type PreorderChipStatus = "paid" | "cooking" | "ready"

// Priority: ready implies cooking implies paid — collapse the three booleans
// into one state so callers don't re-derive the same ordering themselves.
export function getPreorderChipStatus(flags: {
  preorder_cooking?: boolean
  preorder_ready?: boolean
}): PreorderChipStatus {
  if (flags.preorder_ready) return "ready"
  if (flags.preorder_cooking) return "cooking"
  return "paid"
}
