import type { OrderItem } from "@/types/api/types.gen"

/**
 * Category → accent colour for kitchen tickets.
 *
 * Colours live on the frontend and are keyed by `menu_item_category_name`.
 * Category names are restaurant-defined (Ukrainian in seed data), so any name
 * not listed here — or a null category — falls back to {@link DEFAULT_COLOR}.
 * Keying by name is simpler than by id but brittle to renames; the gray
 * fallback keeps unmapped categories readable rather than breaking.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Салати: "#22c55e", // green
  "Гарячі страви": "#ef4444", // red — meat / hot dishes
  Супи: "#f59e0b", // amber
  Напої: "#3b82f6", // blue
  Десерти: "#ec4899", // pink
}

/** Gray, for null or unmapped categories. */
export const DEFAULT_COLOR = "#9ca3af"

export function colorFor(item: Pick<OrderItem, "menu_item_category_name">): string {
  return CATEGORY_COLORS[item.menu_item_category_name ?? ""] ?? DEFAULT_COLOR
}
