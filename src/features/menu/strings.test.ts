import { describe, expect, it } from "vitest"
import { menuStrings } from "./strings"

describe("menuStrings cart position plural (Ukrainian)", () => {
  it("picks the right plural form for cart.positions and cartBar.items", () => {
    for (const label of [menuStrings.cart.positions, menuStrings.cartBar.items]) {
      expect(label(1)).toBe("1 позиція")
      expect(label(2)).toBe("2 позиції")
      expect(label(4)).toBe("4 позиції")
      expect(label(5)).toBe("5 позицій")
      // 11–14 are the exception that still take the genitive plural.
      expect(label(11)).toBe("11 позицій")
      expect(label(13)).toBe("13 позицій")
      expect(label(21)).toBe("21 позиція")
      expect(label(22)).toBe("22 позиції")
    }
  })
})
