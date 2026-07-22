import { describe, expect, it } from "vitest"
import i18n from "@/i18n/config"

describe("menu cart positions plural (Ukrainian)", () => {
  it("picks the right plural form for cart.positions", async () => {
    await i18n.changeLanguage("uk")

    expect(i18n.t("menu.cart.positions", { count: 1 })).toBe("1 позиція")
    expect(i18n.t("menu.cart.positions", { count: 2 })).toBe("2 позиції")
    expect(i18n.t("menu.cart.positions", { count: 4 })).toBe("4 позиції")
    expect(i18n.t("menu.cart.positions", { count: 5 })).toBe("5 позицій")
    expect(i18n.t("menu.cart.positions", { count: 11 })).toBe("11 позицій")
    expect(i18n.t("menu.cart.positions", { count: 13 })).toBe("13 позицій")
    expect(i18n.t("menu.cart.positions", { count: 21 })).toBe("21 позиція")
    expect(i18n.t("menu.cart.positions", { count: 22 })).toBe("22 позиції")
  })
})
